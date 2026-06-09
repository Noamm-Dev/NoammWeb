import { Suspense, useMemo, useState } from "react"
import { RotateCcw, Type } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { MinecraftSkinViewer } from "../components/MinecraftSkinViewer"
import { MinecraftTextPreview } from "../components/MinecraftTextPreview"
import { SiteCredit } from "../components/SiteCredit"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import { DEFAULT_SCALE, SCALE_AXES, SLIDER_CONFIG } from "../content/database"
import type { Scale } from "../types/profile"

type ParsedScale = { error: string, value: null } | { error: null, value: Scale }
type ScaleAxis = typeof SCALE_AXES[number]
type ScaleInputState = Record<ScaleAxis, string>

const PREVIEW_USERNAME = "Noamm"

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
  const [ customName, setCustomName ] = useState("")
  const [ scaleInput, setScaleInput ] = useState<ScaleInputState>(() => scaleToScaleInput(DEFAULT_SCALE))

  const parsedScale = useMemo(() => parseScaleInputState(scaleInput), [ scaleInput ])
  const previewScale = parsedScale.error === null ? parsedScale.value : DEFAULT_SCALE
  const nameTag = customName.trim() || PREVIEW_USERNAME
  const skinUrl = `https://mc-heads.net/skin/${ encodeURIComponent(PREVIEW_USERNAME) }`
  const birdFlopRgbUrl = `https://www.birdflop.com/resources/rgb/?colors=%5B%7B%22hex%22%3A%22%233E9FD3%22%2C%22pos%22%3A100%7D%5D&text=${ encodeURIComponent(PREVIEW_USERNAME) }&format=%7B%22color%22%3A%22JSON%22%7D`

  const setCustomScale = (axis: ScaleAxis, value: string) => {
    const normalizedValue = value.replace(/,/g, ".")
    setScaleInput((currentState) => ({ ...currentState, [axis]: normalizedValue }))
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
      <section className="glass-card mx-auto w-full max-w-6xl p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Preview</p>
            <h1 className="gradient-text mt-1 break-words text-3xl font-extrabold leading-tight sm:text-4xl">
              { PREVIEW_USERNAME }
            </h1>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0">
            <div className="grid gap-5">
              <div className="max-w-[730px]">
                <TextField
                  autoComplete="off"
                  icon={ <Type className="h-3.5 w-3.5" aria-hidden="true"/> }
                  label="Custom Name (JSON Component)"
                  onChange={ event => setCustomName(event.target.value) }
                  placeholder={ `{"text":"${ PREVIEW_USERNAME }","color":"#4498DB"}` }
                  value={ customName }
                />
                <p className="mb-2 mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/42">
                  <span aria-hidden="true">ⓘ</span>
                  <span>
                    To format a custom name, use{" "}
                    <a
                      className="text-cyan-200/85 transition hover:text-cyan-100"
                      href={ birdFlopRgbUrl }
                      rel="noreferrer"
                      target="_blank"
                    >
                      BirdFlop RGB
                    </a>
                    .
                  </span>
                </p>
              </div>

              <div>
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                  <Type className="h-3.5 w-3.5" aria-hidden="true"/>
                  <span>Preview</span>
                </span>
                <div className="max-w-[730px]">
                  <MinecraftTextPreview
                    className="minecraft-preview-centered"
                    emptyLabel={ PREVIEW_USERNAME }
                    value={ customName }
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
                    icon={ <RotateCcw className="h-3.5 w-3.5" aria-hidden="true"/> }
                    onClick={ () => setScaleInput(scaleToScaleInput(DEFAULT_SCALE)) }
                    variant="ghost"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  { SCALE_AXES.map((axis) => (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3" key={ axis }>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55" htmlFor={ `preview-scale-${ axis }` }>
                          Size { axis.toUpperCase() }
                        </label>
                        <input
                          className="h-10 w-20 rounded-xl border border-white/10 bg-white/[0.05] px-2 text-center text-sm font-semibold text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/15"
                          id={ `preview-scale-${ axis }` }
                          inputMode="decimal"
                          onChange={ (event) => setCustomScale(axis, event.target.value) }
                          type="text"
                          value={ scaleInput[axis] }
                        />
                      </div>
                      <input
                        aria-label={ `Size ${ axis.toUpperCase() } slider` }
                        className="scale-slider mt-3"
                        max={ SLIDER_CONFIG.max }
                        min={ SLIDER_CONFIG.min }
                        onChange={ (event) => setCustomScale(axis, event.target.value) }
                        step={ SLIDER_CONFIG.step }
                        type="range"
                        value={ getScaleSliderValue(scaleInput[axis], DEFAULT_SCALE[axis]) }
                      />
                    </div>
                  )) }
                </div>
              </div>

              <StatusBanner message={ parsedScale.error } tone="error"/>
            </div>
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
