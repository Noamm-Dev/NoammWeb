import { useEffect, useRef, useState } from "react"
import { Bold, Italic, Plus, Trash2 } from "lucide-react"
import { generateOutput, rgbDefaults } from "@birdflop/rgbirdflop"
import { getPlainMinecraftText } from "../lib/minecraft-text"
import { MinecraftTextPreview } from "./MinecraftTextPreview"

interface RGBirdflopGeneratorProps {
  disabled?: boolean
  previewEmptyLabel?: string
  previewValue?: string
  initialText?: string
  initialValue?: string
  onGenerate: (output: string) => void
}

type RGBColorStop = { hex: string, pos: number }

type StoredRun = {
  bold: boolean
  color: string | null
  italic: boolean
  shadowColor: string | null
  text: string
}

type GeneratorState = {
  bold: boolean
  colors: RGBColorStop[]
  enableShadow: boolean
  italic: boolean
  shadowColors: RGBColorStop[]
  text: string
}

const DEFAULT_MAIN_COLORS: RGBColorStop[] = [ { hex: "#3E9FD3", pos: 0 } ]
const DEFAULT_SHADOW_COLORS: RGBColorStop[] = [ { hex: "#1D4B66", pos: 0 } ]
const COLOR_STOP_GRID_CLASSES = "rgbirdflop-color-grid grid max-h-[164px] grid-cols-1 gap-1.5 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2"
const COLOR_STOP_ITEM_CLASSES = "flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-2"

const defaultGeneratorState = (text: string): GeneratorState => ({
  bold: false,
  colors: [ ...DEFAULT_MAIN_COLORS ],
  enableShadow: false,
  italic: false,
  shadowColors: [ ...DEFAULT_SHADOW_COLORS ],
  text
})

const normalizeHexColor = (value: unknown, fallback: string | null) => {
  if (typeof value !== "string") return fallback
  const raw = value.trim()
  if (! raw) return fallback
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    const hex = raw.slice(1)
    return `#${ hex[0] }${ hex[0] }${ hex[1] }${ hex[1] }${ hex[2] }${ hex[2] }`.toUpperCase()
  }
  if (/^#[0-9a-f]{6}$/i.test(raw) || /^#[0-9a-f]{8}$/i.test(raw)) return raw.toUpperCase()
  return fallback
}

const shadowColorToHex = (value: unknown, fallback: string | null): string | null => {
  if (Array.isArray(value) && value.length >= 3) {
    const toHex = (c: unknown) => Math.round((Number(c) || 0) * 255).toString(16).padStart(2, "0")
    return `#${ toHex(value[0]) }${ toHex(value[1]) }${ toHex(value[2]) }`.toUpperCase()
  }
  if (value === null || value === "") return null
  if (typeof value === "string" && value.trim().toLowerCase() === "reset") return null
  return normalizeHexColor(value, fallback)
}

const collectStoredRuns = (node: unknown, inherited: Omit<StoredRun, "text"> = {
  bold: false,
  color: null,
  italic: false,
  shadowColor: null
}, runs: StoredRun[] = []): StoredRun[] => {
  if (node === undefined || node === null) return runs

  if ([ "string", "number", "boolean" ].includes(typeof node)) {
    const text = node.toString()
    if (text) runs.push({ ...inherited, text })
    return runs
  }

  if (Array.isArray(node)) {
    for (const part of node) collectStoredRuns(part, inherited, runs)
    return runs
  }

  if (typeof node !== "object") return runs

  const record = node as Record<string, unknown>
  const currentStyle = {
    bold: record.bold !== undefined ? Boolean(record.bold) : inherited.bold,
    color: normalizeHexColor(record.color, inherited.color),
    italic: record.italic !== undefined ? Boolean(record.italic) : inherited.italic,
    shadowColor: shadowColorToHex(record.shadow_color ?? record.shadowColor, inherited.shadowColor)
  }

  if (record.text !== undefined && record.text !== null) {
    const text = record.text.toString()
    if (text) runs.push({ ...currentStyle, text })
  }

  if (Array.isArray(record.extra)) {
    for (const part of record.extra) collectStoredRuns(part, currentStyle, runs)
  }

  return runs
}

const buildColorStops = (runs: StoredRun[], key: "color" | "shadowColor", fallback: RGBColorStop[]) => {
  const totalLength = runs.reduce((sum, run) => sum + run.text.length, 0)
  if (totalLength <= 0) return [ ...fallback ]

  const stops: RGBColorStop[] = []
  let consumedLength = 0
  let previousColor: string | null = null

  for (const run of runs) {
    const color = run[key]
    if (color && color !== previousColor) {
      stops.push({ hex: color, pos: Math.round((consumedLength / totalLength) * 100) })
      previousColor = color
    }
    consumedLength += run.text.length
  }

  if (stops.length === 0) return [ ...fallback ]
  if (stops[0].pos !== 0) stops[0] = { ...stops[0], pos: 0 }
  return stops
}

const buildInitialState = (initialValue: string | undefined, initialText: string): GeneratorState => {
  const fallbackText = initialText.trim()
  const rawValue = initialValue?.trim() ?? ""

  if (! rawValue) return defaultGeneratorState(fallbackText)

  try {
    const parsed = JSON.parse(rawValue) as unknown
    const runs = collectStoredRuns(parsed)
    const plainText = getPlainMinecraftText(rawValue).trim()

    if (runs.length === 0) return defaultGeneratorState(plainText || fallbackText)

    const shadowColors = buildColorStops(runs, "shadowColor", DEFAULT_SHADOW_COLORS)

    return {
      bold: runs.some((run) => run.bold),
      colors: buildColorStops(runs, "color", DEFAULT_MAIN_COLORS),
      enableShadow: runs.some((run) => run.shadowColor !== null),
      italic: runs.some((run) => run.italic),
      shadowColors,
      text: plainText || fallbackText
    }
  }
  catch {
    const plainText = getPlainMinecraftText(rawValue).trim()
    return defaultGeneratorState(plainText || fallbackText)
  }
}

function MultiColorSlider({ colors, onChange, disabled }: { colors: { hex: string, pos: number }[], onChange: (colors: { hex: string, pos: number }[]) => void, disabled?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [ draggingIdx, setDraggingIdx ] = useState<number | null>(null)

  const handlePointerDown = (e: React.PointerEvent, idx: number) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingIdx(idx)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdx === null || ! trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    let newPos = ((e.clientX - rect.left) / rect.width) * 100
    newPos = Math.max(0, Math.min(100, newPos))

    const newColors = [ ...colors ]
    newColors[draggingIdx] = { ...newColors[draggingIdx], pos: Math.round(newPos) }
    onChange(newColors)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingIdx !== null) {
      setDraggingIdx(null)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    }
  }

  const sortedColors = [ ...colors ].sort((a, b) => a.pos - b.pos)
  const gradientString = sortedColors.length > 1
    ? `linear-gradient(to right, ${ sortedColors.map(c => `${ c.hex } ${ c.pos }%`).join(', ') })`
    : sortedColors[0]?.hex || '#000'

  return (
    <div className="relative h-8 w-full flex items-center mb-1 px-2.5" ref={ trackRef }>
      <div className="absolute left-2.5 right-2.5 h-[6px] rounded-full ring-1 ring-white/10" style={ { background: gradientString } }/>
      { colors.map((color, idx) => (
        <div
          key={ idx }
          onPointerDown={ (e) => handlePointerDown(e, idx) }
          onPointerMove={ handlePointerMove }
          onPointerUp={ handlePointerUp }
          className="absolute w-4.5 h-4.5 rounded-full ring-2 ring-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.45)] cursor-grab active:cursor-grabbing transition-transform touch-none"
          style={ {
            left: `calc(10px + (100% - 20px) * ${ color.pos } / 100)`,
            backgroundColor: color.hex,
            zIndex: draggingIdx === idx ? 10 : 1,
            transform: draggingIdx === idx ? 'translateX(-50%) scale(1.2)' : 'translateX(-50%)'
          } }
        />
      )) }
    </div>
  )
}

function Toggle({ checked, onChange, disabled, label }: { checked: boolean, onChange: (v: boolean) => void, disabled?: boolean, label: React.ReactNode }) {
  return (
    <label className={ `flex items-center gap-2 select-none ${ disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer" }` }>
      <button
        type="button"
        role="switch"
        aria-checked={ checked }
        disabled={ disabled }
        onClick={ () => onChange(! checked) }
        className={ `relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ring-1 ring-inset ring-white/10 ${ checked ? "bg-cyan-400/80" : "bg-white/[0.06]" }` }
      >
        <span
          className="absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all duration-200"
          style={ { left: checked ? "18px" : "2px" } }
        />
      </button>
      <span className="text-xs font-semibold text-white/70">{ label }</span>
    </label>
  )
}

export function RGBirdflopGenerator({
  disabled,
  initialText = "",
  initialValue,
  onGenerate,
  previewEmptyLabel = initialText,
  previewValue
}: RGBirdflopGeneratorProps) {
  const initialState = useState(() => buildInitialState(initialValue, initialText))[0]
  const [ text, setText ] = useState(initialState.text)
  const [ colors, setColors ] = useState(initialState.colors)

  const [ bold, setBold ] = useState(initialState.bold)
  const [ italic, setItalic ] = useState(initialState.italic)

  const [ enableShadow, setEnableShadow ] = useState(initialState.enableShadow)
  const [ shadowColors, setShadowColors ] = useState(initialState.shadowColors)

  useEffect(() => {
    const limit = Math.max(1, text.length)
    if (colors.length > limit) {
      setColors(prev => prev.slice(0, limit))
    }
    if (shadowColors.length > limit) {
      setShadowColors(prev => prev.slice(0, limit))
    }
  }, [ text, colors.length, shadowColors.length ])

  const addColor = () => {
    if (colors.length >= Math.max(1, text.length)) return
    setColors([ ...colors, { hex: "#FFFFFF", pos: 100 } ])
  }

  const removeColor = (index: number) => {
    if (colors.length <= 1) return
    setColors(colors.filter((_, i) => i !== index))
  }

  const updateColor = (index: number, key: 'hex' | 'pos', value: string | number) => {
    const newColors = [ ...colors ]
    newColors[index] = { ...newColors[index], [key]: value }
    setColors(newColors)
  }

  const addShadowColor = () => {
    if (shadowColors.length >= Math.max(1, text.length)) return
    setShadowColors([ ...shadowColors, { hex: "#000000", pos: 100 } ])
  }

  const removeShadowColor = (index: number) => {
    if (shadowColors.length <= 1) return
    setShadowColors(shadowColors.filter((_, i) => i !== index))
  }

  const updateShadowColor = (index: number, key: 'hex' | 'pos', value: string | number) => {
    const newColors = [ ...shadowColors ]
    newColors[index] = { ...newColors[index], [key]: value }
    setShadowColors(newColors)
  }

  useEffect(() => {
    if (! text) return
    const store = {
      ...rgbDefaults,
      text,
      format: { color: "JSON" } as any,
      colors,
      shadowcolors: enableShadow ? shadowColors : null,
      bold,
      italic,
      gradientType: "rgb",
      disperse: false // using manual slider pos instead of automatic
    }
    const output = generateOutput(store)
    onGenerate(output)
  }, [
    text, colors, enableShadow, shadowColors, bold, italic, onGenerate
  ])

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
      { previewValue !== undefined ? (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Display Name Preview
          </span>
          <MinecraftTextPreview
            className="minecraft-preview-centered min-h-[48px]"
            emptyLabel={ previewEmptyLabel }
            value={ previewValue }
          />
        </div>
      ) : null }

      <div className="flex flex-col gap-3.5">
        <input
          className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={ disabled }
          onChange={ (e) => setText(e.target.value) }
          placeholder="Text to gradient..."
          type="text"
          value={ text }
        />

        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          <Toggle checked={ bold } onChange={ setBold } disabled={ disabled } label={ <span className="flex items-center gap-1.5"><Bold className="w-3.5 h-3.5"/>Bold</span> }/>
          <Toggle checked={ italic } onChange={ setItalic } disabled={ disabled } label={ <span className="flex items-center gap-1.5"><Italic className="w-3.5 h-3.5"/>Italic</span> }/>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Main Colors</span>
            <button
              type="button"
              onClick={ addColor }
              disabled={ disabled || colors.length >= Math.max(1, text.length) }
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition flex items-center gap-1 disabled:opacity-30 disabled:hover:text-cyan-300"
            >
              <Plus className="w-3.5 h-3.5"/> Add Color
            </button>
          </div>
          <MultiColorSlider colors={ colors } onChange={ setColors } disabled={ disabled }/>
          <div className={ COLOR_STOP_GRID_CLASSES }>
            { colors.map((color, idx) => (
              <div key={ idx } className={ COLOR_STOP_ITEM_CLASSES }>
                <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
                  <input
                    type="color"
                    value={ color.hex }
                    onChange={ e => updateColor(idx, 'hex', e.target.value) }
                    disabled={ disabled }
                    className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
                <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wide text-white/75">{ color.hex.toUpperCase() }</span>
                <span className="text-[11px] font-mono text-white/35 tabular-nums">{ color.pos }%</span>
                <button
                  type="button"
                  onClick={ () => removeColor(idx) }
                  disabled={ disabled || colors.length <= 1 }
                  className="p-1 text-white/35 hover:text-red-400 transition disabled:opacity-20 disabled:hover:text-white/35"
                >
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            )) }
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/10">
          <Toggle checked={ enableShadow } onChange={ setEnableShadow } disabled={ disabled } label="Shadow Colors"/>

          { enableShadow && (
            <div className="space-y-2.5 mt-2.5 pl-3 border-l-2 border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Shadow Colors</span>
                <button
                  type="button"
                  onClick={ addShadowColor }
                  disabled={ disabled || shadowColors.length >= Math.max(1, text.length) }
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition flex items-center gap-1 disabled:opacity-30 disabled:hover:text-cyan-300"
                >
                  <Plus className="w-3.5 h-3.5"/> Add Color
                </button>
              </div>
              <MultiColorSlider colors={ shadowColors } onChange={ setShadowColors } disabled={ disabled }/>
              <div className={ COLOR_STOP_GRID_CLASSES }>
                { shadowColors.map((color, idx) => (
                  <div key={ idx } className={ COLOR_STOP_ITEM_CLASSES }>
                    <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
                      <input
                        type="color"
                        value={ color.hex }
                        onChange={ e => updateShadowColor(idx, 'hex', e.target.value) }
                        disabled={ disabled }
                        className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-0 p-0"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wide text-white/75">{ color.hex.toUpperCase() }</span>
                    <span className="text-[11px] font-mono text-white/35 tabular-nums">{ color.pos }%</span>
                    <button
                      type="button"
                      onClick={ () => removeShadowColor(idx) }
                      disabled={ disabled || shadowColors.length <= 1 }
                      className="p-1 text-white/35 hover:text-red-400 transition disabled:opacity-20 disabled:hover:text-white/35"
                    >
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                )) }
              </div>
            </div>
          ) }
        </div>
      </div>
    </div>
  )
}
