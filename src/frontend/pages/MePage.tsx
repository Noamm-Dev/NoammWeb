import { type FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { LogOut, RotateCcw, Sparkles, Timer, Type } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { MinecraftTextPreview } from "../components/MinecraftTextPreview"
import { SiteCredit } from "../components/SiteCredit"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import AuthSession from "../lib/AuthSession"
import { cssRgbToHalo, HALO_DEFAULT, haloRgbToCss, haloToCss } from "../lib/halo"
import NoammApi, { NoammApiError } from "../lib/NoammApi"
import NotificationManager from "../lib/NotificationManager"
import { getPlainMinecraftText } from "../lib/minecraft-text"
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

const NAME_INVALID_CHARACTERS_REGEX = /[^A-Za-z0-9_]/g
const BANNED_NAME_CHARACTERS = new Set([ '卐', '卍' ])
const SCALE_MIN_ABSOLUTE = 0.09
const HALO_DEBOUNCE_DELAY_MS = 500

const scaleValuesClose = (a: number, b: number) => Math.abs(a - b) < 0.001
const getCustomNameError = (name: string, username: string | null): string | null => {
  const plainText = getPlainMinecraftText(name)
  if (Array.from(plainText).some((character) => BANNED_NAME_CHARACTERS.has(character))) {
    return "Your custom name contains a forbidden character."
  }

  if (! username) return null

  const cleanName = plainText.replace(NAME_INVALID_CHARACTERS_REGEX, "").trim()
  if (cleanName.toLowerCase() !== username.toLowerCase()) {
    return "Your custom name must match Minecraft username. Only symbols/unicodes are supported before/after it."
  }

  return null
}

const validateScale = (scale: Scale): ParsedScale => {
  for (const value of Object.values(scale)) {
    if (! Number.isFinite(value)) return { error: "Scale values must be valid numbers.", value: null }
    if (value < SLIDER_CONFIG.min || value > SLIDER_CONFIG.max) return {
      error: `Scale values must stay between ${ SLIDER_CONFIG.min } and ${ SLIDER_CONFIG.max }.`, value: null
    }
    if (Math.abs(value) <= SCALE_MIN_ABSOLUTE) return {
      error: `Scale values must be at least ${ SCALE_MIN_ABSOLUTE } away from zero.`, value: null
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

  const handleGenerateName = useCallback((output: string) => setDatabaseEntry((entry) => entry.copy().setName(output)), [])

  const haloInputRef = useRef<HTMLInputElement | null>(null)
  const haloDebounceRef = useRef<number | null>(null)

  const handleSetHalo = (rgb: string) => {
    if (haloDebounceRef.current !== null) window.clearTimeout(haloDebounceRef.current)

    haloDebounceRef.current = window.setTimeout(() => {
      haloDebounceRef.current = null
      const nextHalo = cssRgbToHalo(rgb, 255)
      if (nextHalo !== null) setDatabaseEntry((entry) => entry.copy().setHalo(nextHalo))
    }, HALO_DEBOUNCE_DELAY_MS)
  }

  const resetCustomHalo = () => {
    if (haloDebounceRef.current !== null) {
      window.clearTimeout(haloDebounceRef.current)
      haloDebounceRef.current = null
    }

    if (haloInputRef.current) haloInputRef.current.value = haloRgbToCss(HALO_DEFAULT)
    setDatabaseEntry((entry) => entry.copy().setHalo(HALO_DEFAULT))
  }

  const haloInputCss = haloRgbToCss(databaseEntry.hasCustomHalo() ? databaseEntry.getHalo() : HALO_DEFAULT)

  useEffect(() => {
    if (haloInputRef.current) haloInputRef.current.value = haloInputCss
  }, [ haloInputCss ])

  const setCustomScale = (axis: DatabaseEntryAxis, value: string) => {
    const normalizedValue = value.replace(/,/g, ".")
    setScaleInput((currentState) => ({ ...currentState, [axis]: normalizedValue }))

    const parsedValue = parseScaleInput(normalizedValue)
    if (Number.isFinite(parsedValue)) setDatabaseEntry((entry) => entry.copy().setSize(axis, parsedValue))
  }

  const resetCustomScale = () => {
    setScaleInput({ x: "1.00", y: "1.00", z: "1.00" })
    setDatabaseEntry((entry) => entry.copy().setSizeX(1).setSizeY(1).setSizeZ(1))
  }

  const expireAuthSession = useCallback(() => {
    AuthSession.clear()
    setPlayer(null)
    setSessionSource(null)
    setSessionRemainingMs(null)
    setIsSaving(false)
    setSuccessMessage(null)
    setErrorMessage(null)
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
  const canEditHalo = player?.hasHalo !== false
  const serverBacked = sessionSource === "server"
  const hasNameChanged = player !== null && customName !== player.displayName
  const hasScaleChanged = player !== null && parsedScale.error === null && ! scalesEqual(parsedScale.value, player.scale)
  const hasHaloChanged = player !== null && canEditHalo && player.halo !== null && databaseEntry.getHalo() !== player.halo
  const hasChanges = hasNameChanged || hasScaleChanged || hasHaloChanged
  const previewHalo = databaseEntry.hasCustomHalo() ? databaseEntry.getHalo() : (canEditHalo ? HALO_DEFAULT : null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (! player) return
    if (! serverBacked) return NotificationManager.notify({ message: "Profile saving needs an active MC-ID session.", tone: "error" })
    if (! AuthSession.read()) return expireAuthSession()
    if (parsedScale.value === null) return NotificationManager.notify({ message: parsedScale.error, tone: "error" })
    if (! hasChanges) return

    if (! canEditName && hasNameChanged) return NotificationManager.notify({ message: "You do not have permission to edit your custom name.", tone: "error" })
    if (! canEditSize && hasScaleChanged) return NotificationManager.notify({ message: "You do not have permission to edit your size.", tone: "error" })
    if (! canEditHalo && hasHaloChanged) return NotificationManager.notify({ message: "You do not have permission to edit your halo.", tone: "error" })
    if (customName !== null) {
      const nameError = getCustomNameError(customName, player.username)
      if (nameError) return NotificationManager.notify({ message: nameError, tone: "error" })
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

      const rejectedMessages: string[] = []
      if (getPlainMinecraftText(response.getName()) !== getPlainMinecraftText(entryToSave.getName())) {
        rejectedMessages.push("Your custom name was rejected by the server. It must match your current Minecraft username.")
      }

      const submittedScale = entryToSave.toScale()
      const savedScale = response.toScale()
      if (! scaleValuesClose(savedScale.x, submittedScale.x) || ! scaleValuesClose(savedScale.y, submittedScale.y) || ! scaleValuesClose(savedScale.z, submittedScale.z)) {
        rejectedMessages.push("Your scale was rejected by the server.")
      }

      if (response.getHalo() !== entryToSave.getHalo()) rejectedMessages.push("Your halo color was rejected by the server.")

      if (rejectedMessages.length > 0) setErrorMessage(rejectedMessages.join(" "))
      else setSuccessMessage("Profile saved.")
    }
    catch (error) {
      if (error instanceof NoammApiError && (error.status === 401 || error.status === 403)) return expireAuthSession()

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
    <main className="relative grid h-screen overflow-hidden place-items-center px-5 py-8">
      <section className="glass-card w-full max-w-[460px] p-6 text-center">
        <p className="text-sm font-semibold text-white/55">Loading profile...</p>
        <SiteCredit className="mt-5"/>
      </section>
    </main>
  )

  if (! player) return <Navigate replace to="/login"/>

  const playerIdentity = player.username ?? player.uuid
  const encodedPlayerIdentity = encodeURIComponent(playerIdentity)
  const skinUrl = `https://mc-heads.net/skin/${ encodedPlayerIdentity }`
  const displayLabel = player.username ?? player.uuid
  const isDonor = canEditName || canEditSize || canEditHalo

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card flex mx-auto w-full max-w-4xl flex-col px-8 py-7 text-center sm:px-9 sm:py-8">

        {/* Editor Header */ }
        <div className="flex flex-row items-center justify-between mb-8 pb-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={ `https://mc-heads.net/head/${ encodedPlayerIdentity }/96` }
                alt={ `${ displayLabel } Minecraft head` }
                className="h-16 w-16 rounded-full border border-white/10 bg-[#111116] object-contain p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                style={ { imageRendering: "pixelated" } }
              />
              <span className="absolute -bottom-2 left-1/2 min-w-[58px] -translate-x-1/2 rounded-full bg-[#70a7ff] px-2.5 py-1 text-center text-[10px] font-extrabold uppercase leading-none tracking-wide text-white shadow-[0_6px_16px_rgba(112,167,255,0.34)] select-none">
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

              {/* Visual Gradient Generator */ }
              <div className="flex flex-col gap-4">
                { canEditName && (
                  <RGBirdflopGenerator
                    disabled={ isSaving }
                    initialText={ displayLabel }
                    initialValue={ databaseEntry.getName() }
                    onGenerate={ handleGenerateName }
                    previewEmptyLabel={ displayLabel }
                    previewValue={ databaseEntry.getName() }
                  />
                ) }

                { ! canEditName && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                      Display Name Preview
                    </span>
                    <MinecraftTextPreview
                      className="minecraft-preview-centered min-h-[48px]"
                      emptyLabel={ displayLabel }
                      value={ databaseEntry.getName() }
                    />
                  </div>
                ) }

                <TextField
                  autoComplete="off"
                  disabled={ isSaving || ! canEditName }
                  icon={ <Type className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true"/> }
                  label="Custom Name"
                  multiline={ false }
                  onChange={ event => handleGenerateName(event.target.value) }
                  placeholder={ `{"text":"${ displayLabel }","color":"#4498DB"}` }
                  value={ databaseEntry.getName() }
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Skin Viewer & Scaling */ }
            <div className="flex flex-col gap-4 text-left">

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Player Scale</label>
                <ActionButton
                  aria-label="Reset scale"
                  className="h-9 min-h-9 rounded-xl px-3 py-0 text-[10px] font-bold uppercase tracking-wider"
                  disabled={ isSaving || ! canEditSize }
                  icon={ <RotateCcw className="h-3.5 w-3.5" aria-hidden="true"/> }
                  onClick={ resetCustomScale }
                  variant="secondary"
                >
                  Reset
                </ActionButton>
              </div>

              {/* Transparent viewport container */ }
              <div className="relative flex h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                <Suspense fallback={
                  <div className="grid aspect-[3/4] h-[320px] w-full place-items-center rounded-xl bg-black/20 text-xs font-semibold text-zinc-500">
                    Loading skin...
                  </div>
                }>
                  <MinecraftSkinViewer height={ 320 } halo={ previewHalo } scale={ previewScale } skinUrl={ skinUrl } width={ 320 }/>
                </Suspense>
              </div>

              {/* Scale Tuning Sliders */ }
              <div className="flex flex-col gap-4 mt-2">
                { SCALE_AXES.map((axis) => (
                  <div className="grid grid-cols-[1rem_minmax(0,1fr)_4.75rem] items-center gap-3" key={ axis }>
                    <label
                      className="text-xs font-bold text-zinc-500"
                      htmlFor={ `me-scale-${ axis }` }
                    >
                      { axis.toUpperCase() }
                    </label>
                    <input
                      aria-label={ `Size ${ axis.toUpperCase() } slider` }
                      className="scale-slider"
                      disabled={ isSaving || ! canEditSize }
                      max={ SLIDER_CONFIG.max }
                      min={ SLIDER_CONFIG.min }
                      onChange={ (e) => setCustomScale(axis, e.target.value) }
                      step={ SLIDER_CONFIG.step }
                      type="range"
                      value={ getScaleSliderValue(scaleInput[axis], databaseEntry.getSize(axis) ?? DEFAULT_SCALE[axis]) }
                    />
                    <input
                      aria-label={ `Exact size ${ axis.toUpperCase() }` }
                      className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.05] px-2 text-center font-mono text-sm font-bold text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={ isSaving || ! canEditSize }
                      id={ `me-scale-${ axis }` }
                      inputMode="decimal"
                      onChange={ (e) => setCustomScale(axis, e.target.value) }
                      type="text"
                    value={ scaleInput[axis] }
                  />
                </div>
              )) }
              </div>

              <div>
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true"/>
                  <span>Halo Color</span>
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <input
                    aria-label="Halo color"
                    className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    defaultValue={ haloInputCss }
                    disabled={ isSaving || ! canEditHalo }
                    onChange={ (event) => handleSetHalo(event.target.value) }
                    ref={ haloInputRef }
                    type="color"
                  />
                  <span className="shrink-0 rounded-lg border border-white/10 bg-black/15 px-2 py-1 font-mono text-[11px] text-white/55">
                    { haloToCss(databaseEntry.hasCustomHalo() ? databaseEntry.getHalo() : HALO_DEFAULT) }
                  </span>
                  <ActionButton
                    aria-label="Reset halo"
                    className="ml-auto h-9 w-9 shrink-0 rounded-lg border-transparent bg-transparent px-0 py-0 text-white/42 hover:bg-white/[0.04] hover:text-white/70"
                    disabled={ isSaving || ! canEditHalo }
                    icon={ <RotateCcw className="h-3.5 w-3.5" aria-hidden="true"/> }
                    onClick={ resetCustomHalo }
                    variant="ghost"
                  />
                </div>
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