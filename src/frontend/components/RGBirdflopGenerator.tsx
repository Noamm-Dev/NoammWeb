import { useEffect, useRef, useState } from "react"
import { Bold, Italic, Plus, Trash2 } from "lucide-react"
import { generateOutput, rgbDefaults } from "@birdflop/rgbirdflop"

interface RGBirdflopGeneratorProps {
  disabled?: boolean
  initialText?: string
  onGenerate: (output: string) => void
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

export function RGBirdflopGenerator({ disabled, initialText = "", onGenerate }: RGBirdflopGeneratorProps) {
  const [ text, setText ] = useState(initialText)
  const [ colors, setColors ] = useState([ { hex: "#3E9FD3", pos: 0 } ])

  const [ bold, setBold ] = useState(false)
  const [ italic, setItalic ] = useState(false)

  const [ enableShadow, setEnableShadow ] = useState(false)
  const [ shadowColors, setShadowColors ] = useState([ { hex: "#1D4B66", pos: 0 } ])

  useEffect(() => {
    if (initialText && ! text) {
      setText(initialText)
    }
  }, [ initialText ])

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
    <div className="mt-3 flex flex-col gap-3.5 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
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
          <div className="space-y-1.5">
            { colors.map((color, idx) => (
              <div key={ idx } className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-2.5">
                <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
                  <input
                    type="color"
                    value={ color.hex }
                    onChange={ e => updateColor(idx, 'hex', e.target.value) }
                    disabled={ disabled }
                    className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
                <span className="flex-1 text-sm text-white/75 font-mono tracking-wide">{ color.hex.toUpperCase() }</span>
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
              <div className="space-y-1.5">
                { shadowColors.map((color, idx) => (
                  <div key={ idx } className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-2.5">
                    <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10">
                      <input
                        type="color"
                        value={ color.hex }
                        onChange={ e => updateShadowColor(idx, 'hex', e.target.value) }
                        disabled={ disabled }
                        className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-0 p-0"
                      />
                    </div>
                    <span className="flex-1 text-sm text-white/75 font-mono tracking-wide">{ color.hex.toUpperCase() }</span>
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