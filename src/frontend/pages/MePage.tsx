import { type FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { LogOut, RotateCcw, Save, Timer, Type } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { MinecraftTextPreview } from "../components/MinecraftTextPreview"
import { SiteCredit } from "../components/SiteCredit"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import AuthSession from "../lib/AuthSession"
import NoammApi, { NoammApiError } from "../lib/NoammApi"
import { notify } from "../lib/notifications"
import type { ProfilePlayer, Scale } from "../types/profile"
import { MinecraftSkinViewer } from "../components/MinecraftSkinViewer"
import { DEFAULT_SCALE, SCALE_AXES, SLIDER_CONFIG } from "../content/database"
import { formatTime, getErrorMessage } from '../utils'
import DatabaseEntry, { type DatabaseEntryAxis } from '../types/DatabaseEntry'

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
const scaleToScaleInput = (scale: Scale): ScaleInputState => ({
  x: formatScaleInput(scale.x),
  y: formatScaleInput(scale.y),
  z: formatScaleInput(scale.z)
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
  const setCustomScales = (scale: Scale) => {
    setScaleInput(scaleToScaleInput(scale))
    setDatabaseEntry((entry) => entry.copy().setSizeX(scale.x).setSizeY(scale.y).setSizeZ(scale.z))
  }

  const expireAuthSession = useCallback(() => {
    AuthSession.clear()
    setSessionRemainingMs(null)
    notify({ message: "Your MC-ID session expired. Please log in again.", tone: "info" })
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

  useEffect(() => notify({ message: errorMessage, tone: "error" }), [ errorMessage ])
  useEffect(() => notify({ message: successMessage, tone: "success" }), [ successMessage ])

  const parsedScale = useMemo(() => parseScaleInputState(scaleInput), [ scaleInput ])

  const customName = databaseEntry.getName().trim() || null
  const previewScale = parsedScale.error === null ? parsedScale.value : (player?.scale ?? null)
  const nameTag = player ? (customName ?? player.displayName ?? player.username ?? player.uuid) : ""
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

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
      <section className="glass-card mx-auto w-full max-w-6xl p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Profile</p>
            <h1 className="gradient-text mt-1 break-words text-3xl font-extrabold leading-tight sm:text-4xl">
              { displayLabel }
            </h1>
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0">
            <form className="grid gap-5" onSubmit={ handleSubmit }>
              <div className="max-w-[730px]">
                <TextField
                  autoComplete="off"
                  disabled={ isSaving }
                  icon={ <Type className="h-3.5 w-3.5" aria-hidden="true"/> }
                  label="Custom Name (JSON Component)"
                  onChange={ event => setCustomName(event.target.value) }
                  placeholder={ `{"text":"${ displayLabel }","color":"#4498DB"}` }
                  value={ databaseEntry.getName() }
                />
              </div>

              <div>
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                  <Type className="h-3.5 w-3.5" aria-hidden="true"/>
                  <span>Preview</span>
                </span>
                <div className="max-w-[730px]">
                  <MinecraftTextPreview
                    className="minecraft-preview-centered"
                    emptyLabel={ displayLabel }
                    value={ databaseEntry.getName() }
                  />
                </div>
              </div>

              <div className="h-px bg-white/10"/>

              <div className="grid gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Scale</p>
                  <ActionButton
                    aria-label="Reset scale"
                    className="h-9 min-h-9 w-9 px-0 py-0"
                    disabled={ isSaving }
                    icon={ <RotateCcw className="h-3.5 w-3.5" aria-hidden="true"/> }
                    onClick={ () => setCustomScales(player.scale ?? DEFAULT_SCALE) }
                    variant="ghost"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  { SCALE_AXES.map((axis) => (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3" key={ axis }>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55" htmlFor={ `scale-${ axis }` }>
                          Size { axis.toUpperCase() }
                        </label>
                        <input
                          className="h-10 w-20 rounded-xl border border-white/10 bg-white/[0.05] px-2 text-center text-sm font-semibold text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={ isSaving }
                          id={ `scale-${ axis }` }
                          inputMode="decimal"
                          onChange={ (e) => setCustomScale(axis, e.target.value) }
                          type="text"
                          value={ scaleInput[axis] }
                        />
                      </div>
                      <input
                        aria-label={ `Size ${ axis.toUpperCase() } slider` }
                        className="scale-slider mt-3"
                        disabled={ isSaving }
                        max={ SLIDER_CONFIG.max }
                        min={ SLIDER_CONFIG.min }
                        onChange={ (e) => setCustomScale(axis, e.target.value) }
                        step={ SLIDER_CONFIG.step }
                        type="range"
                        value={ getScaleSliderValue(scaleInput[axis], databaseEntry.getSize(axis) ?? DEFAULT_SCALE[axis]) }
                      />
                    </div>
                  )) }
                </div>
              </div>

              <StatusBanner message={ parsedScale.error } tone="error"/>

              <ActionButton
                disabled={ isSaving || ! serverBacked || ! hasChanges || parsedScale.error !== null }
                icon={ <Save className="h-4 w-4" aria-hidden="true"/> }
                type="submit"
                variant="primary"
              >
                { isSaving ? "Saving..." : "Save Profile" }
              </ActionButton>
            </form>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 lg:sticky lg:top-6">
            <Suspense fallback={
              <div className="grid aspect-[3/4] min-h-[360px] place-items-center rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold text-white/45">
                Loading skin...
              </div>
            }>
              <MinecraftSkinViewer height={ 400 } nameTag={ nameTag } scale={ previewScale } skinUrl={ skinUrl } width={ 300 }/>
            </Suspense>
          </aside>
        </div>

        <SiteCredit className="mt-6"/>
      </section>
    </main>
  )
}