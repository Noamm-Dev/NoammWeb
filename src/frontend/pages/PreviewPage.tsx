import { Suspense, useEffect, useMemo, useState } from "react"
import { RotateCcw, Type, UserRound } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { MinecraftSkinViewer } from "../components/MinecraftSkinViewer"
import { RGBirdflopGenerator } from "../components/RGBirdflopGenerator"
import { SiteCredit } from "../components/SiteCredit"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import { DEFAULT_SCALE, SCALE_AXES, SLIDER_CONFIG } from "../content/database"
import type { Scale } from "../types/profile"

type ParsedScale = { error: string, value: null } | { error: null, value: Scale }
type ScaleAxis = typeof SCALE_AXES[number]
type ScaleInputState = Record<ScaleAxis, string>

const PREVIEW_USERNAME = "Noamm"
const DEBOUNCE_DELAY_MS = 500

const isMinecraftUsername = (value: string) => /^[a-zA-Z0-9_]{3,16}$/.test(value.trim())
const formatScaleInput = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? String(value) : "1"
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
      error: `Scale values must stay between ${ SLIDER_CONFIG.min } and ${ SLIDER_CONFIG.max }.`,
      value: null
    }
  }
  return { error: null, value: scale }
}

const getScaleSliderValue = (value: string, fallback: number) => {
  const parsedValue = parseScaleInput(value)
  const safeValue = Number.isFinite(parsedValue) ? parsedValue : fallback
  return Math.min(SLIDER_CONFIG.max, Math.max(SLIDER_CONFIG.min, safeValue))
}

export function PreviewPage() {
  const [ minecraftUsername, setMinecraftUsername ] = useState(PREVIEW_USERNAME)
  const [ debouncedUsername, setDebouncedUsername ] = useState(PREVIEW_USERNAME)
  const [ customName, setCustomName ] = useState("")
  const [ scaleInput, setScaleInput ] = useState<ScaleInputState>(() => scaleToScaleInput(DEFAULT_SCALE))

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedUsername(minecraftUsername), DEBOUNCE_DELAY_MS)
    return () => clearTimeout(handler)
  }, [ minecraftUsername ])

  const parsedScale = useMemo(() => parseScaleInputState(scaleInput), [ scaleInput ])
  const requestedUsername = debouncedUsername.trim() || PREVIEW_USERNAME
  const previewUsername = isMinecraftUsername(requestedUsername) ? requestedUsername : PREVIEW_USERNAME
  const previewScale = parsedScale.error === null ? parsedScale.value : DEFAULT_SCALE
  const nameTag = customName.trim() || previewUsername
  const encodedPreviewUsername = encodeURIComponent(previewUsername)
  const skinUrl = `https://mc-heads.net/skin/${ encodedPreviewUsername }`

  const setCustomScale = (axis: ScaleAxis, value: string) => {
    const normalizedValue = value.replace(/,/g, ".")
    setScaleInput((currentState) => ({ ...currentState, [axis]: normalizedValue }))
  }

  const resetScale = () => setScaleInput(scaleToScaleInput(DEFAULT_SCALE))

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card mx-auto flex w-full max-w-4xl flex-col px-8 py-7 text-center sm:px-9 sm:py-8">
        <div className="mb-8 flex flex-row items-center justify-between border-b border-white/[0.04] pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <img
                alt={ `${ previewUsername } Minecraft head` }
                className="h-16 w-16 rounded-full border border-white/10 bg-[#111116] object-contain p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                src={ `https://mc-heads.net/head/${ encodedPreviewUsername }/96` }
                style={ { imageRendering: "pixelated" } }
              />
              <span className="absolute -bottom-2 left-1/2 min-w-[58px] -translate-x-1/2 rounded-full bg-[#70a7ff] px-2.5 py-1 text-center text-[10px] font-extrabold uppercase leading-none tracking-wide text-white shadow-[0_6px_16px_rgba(112,167,255,0.34)] select-none">
                Preview
              </span>
            </div>
            <div className="min-w-0 text-left">
              <h1 className="truncate text-xl font-bold leading-none tracking-tight text-white">
                { previewUsername }
              </h1>
              <p className="mt-1 text-xs font-medium text-zinc-500">Donator Customisation Preview</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-5 text-left">
            <TextField
              autoComplete="off"
              icon={ <UserRound className="h-3.5 w-3.5" aria-hidden="true"/> }
              label="Minecraft Account"
              onChange={ event => setMinecraftUsername(event.target.value) }
              placeholder={ PREVIEW_USERNAME }
              value={ minecraftUsername }
            />

            <div className="flex flex-col gap-4">
              <RGBirdflopGenerator
                key={ previewUsername }
                initialText={ previewUsername }
                initialValue={ customName }
                onGenerate={ setCustomName }
                previewEmptyLabel={ previewUsername }
                previewValue={ customName }
              />

              <TextField
                autoComplete="off"
                icon={ <Type className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true"/> }
                label="Custom Name"
                multiline={ false }
                onChange={ event => setCustomName(event.target.value) }
                placeholder={ `{"text":"${ previewUsername }","color":"#4498DB"}` }
                value={ customName }
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Player Scale</label>
              <ActionButton
                aria-label="Reset scale"
                className="h-9 min-h-9 rounded-xl px-3 py-0 text-[10px] font-bold uppercase tracking-wider"
                icon={ <RotateCcw className="h-3.5 w-3.5" aria-hidden="true"/> }
                onClick={ resetScale }
                variant="secondary"
              >
                Reset
              </ActionButton>
            </div>

            <div className="relative flex h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
              <Suspense fallback={
                <div className="grid aspect-[3/4] h-[320px] w-full place-items-center rounded-xl bg-black/20 text-xs font-semibold text-zinc-500">
                  Loading skin...
                </div>
              }>
                <MinecraftSkinViewer
                  key={ skinUrl }
                  height={ 320 }
                  nameTag={ nameTag }
                  scale={ previewScale }
                  skinUrl={ skinUrl }
                  width={ 320 }
                />
              </Suspense>
            </div>

            <div className="mt-2 flex flex-col gap-4">
              { SCALE_AXES.map((axis) => (
                <div className="grid grid-cols-[1rem_minmax(0,1fr)_4.75rem] items-center gap-3" key={ axis }>
                  <label
                    className="text-xs font-bold text-zinc-500"
                    htmlFor={ `preview-scale-${ axis }` }
                  >
                    { axis.toUpperCase() }
                  </label>
                  <input
                    aria-label={ `Size ${ axis.toUpperCase() } slider` }
                    className="scale-slider"
                    max={ SLIDER_CONFIG.max }
                    min={ SLIDER_CONFIG.min }
                    onChange={ (event) => setCustomScale(axis, event.target.value) }
                    step={ SLIDER_CONFIG.step }
                    type="range"
                    value={ getScaleSliderValue(scaleInput[axis], DEFAULT_SCALE[axis]) }
                  />
                  <input
                    aria-label={ `Exact size ${ axis.toUpperCase() }` }
                    className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.05] px-2 text-center font-mono text-sm font-bold text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/15"
                    id={ `preview-scale-${ axis }` }
                    inputMode="decimal"
                    onChange={ (event) => setCustomScale(axis, event.target.value) }
                    type="text"
                    value={ scaleInput[axis] }
                  />
                </div>
              )) }
            </div>

            <StatusBanner message={ parsedScale.error } tone="error"/>
          </div>
        </div>

        <SiteCredit className="mt-6"/>
      </section>
    </main>
  )
}
