import { type FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { LogOut, Timer, Type } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { MinecraftTextPreview } from "../components/MinecraftTextPreview"
import { SiteCredit } from "../components/SiteCredit"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import AuthSession from "../lib/AuthSession"
import NoammApi, { NoammApiError } from "../lib/NoammApi"
import NotificationManager from "../lib/NotificationManager"
import type { ProfilePlayer, Scale } from "../types/profile"
import { MinecraftSkinViewer } from "../components/MinecraftSkinViewer"
import { DEFAULT_SCALE, SCALE_AXES, SLIDER_CONFIG } from "../content/database"
import { formatTime, getErrorMessage } from '../utils'
import DatabaseEntry, { type DatabaseEntryAxis } from '../types/DatabaseEntry'
import { RGBirdflopGenerator } from "../components/RGBirdflopGenerator"

type SessionSource = "local" | "server"
type ParsedScale = { error: string, value: null } | { error: null, value: Scale }
type ScaleInputState = Record<DatabaseEntryAxis, string>

const scalesEqual = (a: Scale | null, b: Scale | null) => a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y && a.z === b.z)
const formatScaleInput = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? String(value) : "1"
const entryToScaleInput = (entry: DatabaseEntry): ScaleInputState => ({
  x: formatScaleInput(entry.getSizeX()),
  y: formatScaleInput(entry.getSizeY()),
  z: formatScaleInput(entry.getSizeZ())
})
const parseScaleInputState = (scaleInput: ScaleInputState) => validateScale({
  x: parseScaleInput(scaleInput.x),
  y: parseScaleInput(scaleInput.y),
  z: parseScaleInput(scaleInput.z)
})

const parseScaleInput = (value: string) => {
  const normalizedValue = value.trim().replace(",", ".")
  if (! normalizedValue) return Number.NaN
  return Number(normalizedValue)
}

const validateScale = (scale: Scale): ParsedScale => {
  for (const value of Object.values(scale)) {
    if (! Number.isFinite(value)) return { error: "Scale values must be valid numbers.", value: null }
    if (value < SLIDER_CONFIG.min || value > SLIDER_CONFIG.max) return {
      error: `Scale values must stay between ${ SLIDER_CONFIG.min } and ${ SLIDER_CONFIG.max }.`, value: null
    }
  }
  return { error: null, value: scale }
}

const getScaleSliderValue = (value: string, fallback: number) => {
  const parsedValue = parseScaleInput(value)
  const safeValue = Number.isFinite(parsedValue) ? parsedValue : fallback
  return Math.min(SLIDER_CONFIG.max, Math.max(SLIDER_CONFIG.min, safeValue))
}

export function MePage() {
  const navigate = useNavigate()
  const [ player, setPlayer ] = useState<ProfilePlayer | null>(null)
  const [ sessionSource, setSessionSource ] = useState<SessionSource | null>(null)
  const [ isLoading, setIsLoading ] = useState(true)
  const [ isSaving, setIsSaving ] = useState(false)
  const [ isSigningOut, setIsSigningOut ] = useState(false)
  const [ databaseEntry, setDatabaseEntry ] = useState<DatabaseEntry>(new DatabaseEntry())
  const [ scaleInput, setScaleInput ] = useState<ScaleInputState>(() => entryToScaleInput(new DatabaseEntry()))
  const [ sessionRemainingMs, setSessionRemainingMs ] = useState<number | null>(null)
  const [ errorMessage, setErrorMessage ] = useState<string | null>(null)
  const [ successMessage, setSuccessMessage ] = useState<string | null>(null)

  const setCustomName = (name: string) => setDatabaseEntry((entry) => entry.copy().setName(name))
  const setCustomScale = (axis: DatabaseEntryAxis, value: string) => {
    const normalizedValue = value.replace(/,/g, ".")
    setScaleInput((currentState) => ({ ...currentState, [axis]: normalizedValue }))

    const parsedValue = parseScaleInput(normalizedValue)
    if (Number.isFinite(parsedValue)) setDatabaseEntry((entry) => entry.copy().setSize(axis, parsedValue))
  }

  const expireAuthSession = useCallback(() => {
    AuthSession.clear()
    setSessionRemainingMs(null)
    NotificationManager.notify({ message: "Your MC-ID session expired. Please log in again.", tone: "info" })
    navigate("/login", { replace: true })
  }, [ navigate ])

  useEffect(() => {
    let isMounted = true

    function applyPlayer(player: ProfilePlayer, entry: DatabaseEntry, source: SessionSource) {
      setPlayer(player)
      setSessionSource(source)
      setDatabaseEntry(entry)
      setScaleInput(entryToScaleInput(entry))

      AuthSession.updatePlayer(player)
    }

    async function loadSession() {
      setIsLoading(true)
      try {
        const response = await NoammApi.fetchMe()
        if (! isMounted) return

        if (response.authenticated && response.authorized) return applyPlayer(response.player, response.databaseEntry, "server")

        const local = AuthSession.read()
        if (local) return applyPlayer(local.player, DatabaseEntry.fromUnknown({
          name: local.player.displayName,
          sizeX: local.player.scale?.x,
          sizeY: local.player.scale?.y,
          sizeZ: local.player.scale?.z
        }), "local")
        setPlayer(null)
      }
      catch (error) {
        if (! isMounted) return
        if (error instanceof NoammApiError && (error.status === 401 || error.status === 403)) return expireAuthSession()

        const local = AuthSession.read()
        if (local) return applyPlayer(local.player, DatabaseEntry.fromUnknown({
          name: local.player.displayName,
          sizeX: local.player.scale?.x,
          sizeY: local.player.scale?.y,
          sizeZ: local.player.scale?.z
        }), "local")

        setErrorMessage(getErrorMessage(error))
        setPlayer(null)
      }
      finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadSession()
    return () => {
      isMounted = false
    }
  }, [ expireAuthSession ])

  useEffect(() => {
    if (! player) return

    function sync() {
      const remaining = AuthSession.timeRemaining()
      if (remaining === null || remaining <= 0) return expireAuthSession()
      setSessionRemainingMs(remaining)
    }

    sync()
    const id = window.setInterval(sync, 1000)
    return () => window.clearInterval(id)
  }, [ expireAuthSession, player ])

  useEffect(() => NotificationManager.notify({ message: errorMessage, tone: "error" }), [ errorMessage ])
  useEffect(() => NotificationManager.notify({ message: successMessage, tone: "success" }), [ successMessage ])

  const parsedScale = useMemo(() => parseScaleInputState(scaleInput), [ scaleInput ])

  const customName = databaseEntry.getName().trim() || null
  const previewScale = parsedScale.error === null ? parsedScale.value : (player?.scale ?? null)
  const canEditName = player?.hasName !== false
  const canEditSize = player?.hasSize !== false
  const serverBacked = sessionSource === "server"
  const hasDisplayNameChanged = player !== null && customName !== player.displayName
  const hasScaleChanged = player !== null && parsedScale.error === null && ! scalesEqual(parsedScale.value, player.scale)
  const hasChanges = hasDisplayNameChanged || hasScaleChanged

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (! player) return
    if (! serverBacked) {
      setErrorMessage("Profile saving needs an active MC-ID session.")
      setSuccessMessage(null)
      return
    }

    if (! AuthSession.read()) return expireAuthSession()

    if (parsedScale.value === null) {
      setErrorMessage(parsedScale.error)
      setSuccessMessage(null)
      return
    }

    if (! hasChanges) return

    if (! canEditName && hasDisplayNameChanged) {
      setErrorMessage("You do not have permission to edit your custom name.")
      setSuccessMessage(null)
      return
    }

    if (! canEditSize && hasScaleChanged) {
      setErrorMessage("You do not have permission to edit your size.")
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const entryToSave = databaseEntry.copy().setSizeX(parsedScale.value.x).setSizeY(parsedScale.value.y).setSizeZ(parsedScale.value.z)
      const response = await NoammApi.updateEntry(entryToSave)
      const updatedPlayer = response.toProfilePlayer(player)
      setDatabaseEntry(response)
      setScaleInput(entryToScaleInput(response))
      setPlayer(updatedPlayer)
      AuthSession.updatePlayer(updatedPlayer)
      setSuccessMessage("Profile saved.")
    }
    catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
    finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    setIsSigningOut(true)
    AuthSession.clear()
    setIsSigningOut(false)
    navigate("/login", { replace: true })
  }

  if (isLoading) return (
    <main className="relative grid min-h-screen place-items-center px-5 py-8">
      <section className="glass-card w-full max-w-[460px] p-6 text-center">
        <p className="text-sm font-semibold text-white/55">Loading profile...</p>
        <SiteCredit className="mt-5"/>
      </section>
    </main>
  )

  if (! player) return <Navigate replace to="/login"/>

  const skinUrl = `https://mc-heads.net/skin/${ encodeURIComponent(player.username ?? player.uuid) }`
  const displayLabel = player.username ?? player.uuid
  const isDonor = canEditName || canEditSize

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card flex mx-auto w-full max-w-4xl flex-col px-8 py-7 text-center sm:px-9 sm:py-8">

        {/* Editor Header */ }
        <div className="flex flex-row items-center justify-between mb-8 pb-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={ `https://mc-heads.net/avatar/${ encodeURIComponent(player.username ?? player.uuid) }/64` }
                alt="Player Avatar"
                className="w-14 h-14 rounded-full border border-white/10 bg-[#161619] object-cover"
              />
              {/* Perfectly centered Donor badge with matching blue glow */ }
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#70a7ff] text-[8px] font-extrabold tracking-widest text-white px-2 py-0.5 rounded shadow-[0_4px_10px_rgba(112,167,255,0.3)] uppercase select-none">
                { isDonor ? "Donor" : "User" }
              </span>
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white tracking-tight leading-none mb-1">{ displayLabel }</h1>
              <p className="text-xs text-zinc-500 font-medium">Donator Customisation</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            { sessionRemainingMs !== null && (
              <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.08] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(34,211,238,0.08)]">
                <Timer className="h-4 w-4 text-cyan-200" aria-hidden="true"/>
                <span className="text-white/45">Session</span>
                <span className="font-mono text-base font-extrabold text-white">
                  { formatTime(sessionRemainingMs) }
                </span>
              </div>
            ) }
            <ActionButton
              disabled={ isSigningOut }
              icon={ <LogOut className="h-4 w-4" aria-hidden="true"/> }
              onClick={ () => void handleLogout() }
              variant="danger"
            >
              { isSigningOut ? "Logging out..." : "Logout" }
            </ActionButton>
          </div>
        </div>

        <form
          onSubmit={ handleSubmit }
          onKeyDown={ (e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault()
            }
          } }
        >
          {/* Main Two Column Workspace */ }
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

            {/* LEFT COLUMN: Customizing Inputs */ }
            <div className="flex flex-col gap-5 text-left">

              {/* Display Name Preview Segment */ }
              <div className="flex flex-col gap-1.5">
                <div className="rounded-xl px-4 py-3.5 min-h-[50px] flex items-center justify-start mt-0.5 shadow-inner">
                  <MinecraftTextPreview
                    className="minecraft-preview-centered whitespace-nowrap"
                    emptyLabel={ displayLabel }
                    value={ databaseEntry.getName() }
                  />
                </div>
              </div>

              {/* Visual Gradient Generator First, Raw JSON Field Second */ }
              <div className="flex flex-col gap-4">
                { canEditName && (
                  <div>
                    <RGBirdflopGenerator
                      disabled={ isSaving }
                      initialText={ displayLabel }
                      onGenerate={ setCustomName }
                    />
                  </div>
                ) }

                <TextField
                  autoComplete="off"
                  disabled={ isSaving || ! canEditName }
                  icon={ <Type className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true"/> }
                  label="Custom Name"
                  multiline={ false }
                  onChange={ event => setCustomName(event.target.value) }
                  placeholder={ `{"text":"${ displayLabel }","color":"#4498DB"}` }
                  value={ databaseEntry.getName() }
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Skin Viewer & Scaling */ }
            <div className="flex flex-col gap-4 text-left">

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Player Scale</label>
                <button
                  type="button"
                  onClick={ () => {
                    setCustomScale('x', '1.00')
                    setCustomScale('y', '1.00')
                    setCustomScale('z', '1.00')
                  } }
                  className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Transparent viewport container */ }
              <div className="flex justify-center items-center h-[360px] relative overflow-hidden">
                <Suspense fallback={
                  <div className="grid aspect-[3/4] h-[320px] w-full place-items-center rounded-xl bg-black/20 text-xs font-semibold text-zinc-500">
                    Loading skin...
                  </div>
                }>
                  <MinecraftSkinViewer height={ 320 } scale={ previewScale } skinUrl={ skinUrl } width={ 320 }/>
                </Suspense>
              </div>

              {/* Scale Tuning Sliders */ }
              <div className="flex flex-col gap-4 mt-2">
                { SCALE_AXES.map((axis) => (
                  <div className="flex items-center gap-4" key={ axis }>
                    <span className="w-4 text-xs font-bold text-zinc-500">{ axis.toUpperCase() }</span>
                    <input
                      aria-label={ `Size ${ axis.toUpperCase() } slider` }
                      className="flex-1 accent-[#70a7ff] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      disabled={ isSaving || ! canEditSize }
                      max={ SLIDER_CONFIG.max }
                      min={ SLIDER_CONFIG.min }
                      onChange={ (e) => setCustomScale(axis, e.target.value) }
                      step={ SLIDER_CONFIG.step }
                      type="range"
                      value={ getScaleSliderValue(scaleInput[axis], databaseEntry.getSize(axis) ?? DEFAULT_SCALE[axis]) }
                    />
                    <span className="w-10 text-right text-sm font-mono font-bold text-white">
                      { Number(scaleInput[axis] || 0).toFixed(2) }
                    </span>
                  </div>
                )) }
              </div>

            </div>
          </div>

          <hr className="border-white/[0.04] my-6"/>

          {/* Save & Validation footer */ }
          <div className="flex flex-col gap-3">
            <StatusBanner message={ parsedScale.error } tone="error"/>

            <ActionButton
              disabled={ isSaving || ! serverBacked || ! hasChanges || parsedScale.error !== null || (! canEditName && ! canEditSize) }
              type="submit"
              variant="primary"
              className="w-full bg-[#70a7ff] hover:bg-[#5896ff] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 text-center flex justify-center items-center"
            >
              { isSaving ? "Saving..." : "Save Changes" }
            </ActionButton>
          </div>
        </form>
      </section>
    </main>
  )
}