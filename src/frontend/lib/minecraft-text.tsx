import type { CSSProperties, ReactNode } from "react"
import { isJsonRecord, type JsonRecord } from '../utils.ts'

interface ComponentStyle {
  color: string
  bold: boolean
  italic: boolean
  underlined: boolean
  strikethrough: boolean
  shadow: boolean
  explicitShadowColor: string | null
}

export interface MinecraftTextSegment {
  bold: boolean
  color: string
  fontFamily?: string
  italic: boolean
  shadowColor: string | null
  strikethrough: boolean
  text: string
  underlined: boolean
}

const MINECRAFT_COLORS: Record<string, string> = {
  black: "#000000", dark_blue: "#0000AA", dark_green: "#00AA00",
  dark_aqua: "#00AAAA", dark_red: "#AA0000", dark_purple: "#AA00AA",
  gold: "#FFAA00", gray: "#AAAAAA", dark_gray: "#555555",
  blue: "#5555FF", green: "#55FF55", aqua: "#55FFFF",
  red: "#FF5555", light_purple: "#FF55FF", yellow: "#FFFF55", white: "#FFFFFF"
}

const DEFAULT_STYLE: ComponentStyle = {
  color: "#FFFFFF", bold: false, italic: false, underlined: false,
  strikethrough: false, shadow: true, explicitShadowColor: null
}

const SYMBOL_FONT_STACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans Symbols", "Arial Unicode MS", sans-serif'
const EXTENDED_PICTOGRAPHIC = new RegExp("\\p{Extended_Pictographic}", "u")

const clampColor = (value: string | undefined) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)))
const clampAlpha = (value: number) => Math.max(0, Math.min(1, value))
const formatAlpha = (alpha: number) => Number(alpha.toFixed(3))
const argbToRgba = (colorValue: number) => `rgba(${ (colorValue >>> 16) & 0xff }, ${ (colorValue >>> 8) & 0xff }, ${ colorValue & 0xff }, ${ formatAlpha(((colorValue >>> 24) & 0xff) / 255) })`

function intToCssColor(colorValue: number, preferArgb: boolean) {
  if (! Number.isFinite(colorValue)) return null
  const normalized = colorValue >>> 0
  if (! preferArgb || normalized <= 0xffffff) return `#${ normalized.toString(16).padStart(6, "0").slice(- 6) }`
  return argbToRgba(normalized)
}

function parseColor(colorValue: string) {
  const raw = colorValue.trim()

  let match = raw.match(/^#([0-9a-f]{3})$/i)
  if (match?.[1]) {
    const v = match[1]
    return { red: parseInt(v[0] + v[0], 16), green: parseInt(v[1] + v[1], 16), blue: parseInt(v[2] + v[2], 16), alpha: 1 }
  }

  match = raw.match(/^#([0-9a-f]{6})$/i)
  if (match?.[1]) {
    const v = match[1]
    return { red: parseInt(v.slice(0, 2), 16), green: parseInt(v.slice(2, 4), 16), blue: parseInt(v.slice(4, 6), 16), alpha: 1 }
  }

  match = raw.match(/^#([0-9a-f]{8})$/i)
  if (match?.[1]) {
    const v = match[1]
    return { red: parseInt(v.slice(0, 2), 16), green: parseInt(v.slice(2, 4), 16), blue: parseInt(v.slice(4, 6), 16), alpha: parseInt(v.slice(6, 8), 16) / 255 }
  }

  match = raw.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
  if (match) return { red: clampColor(match[1]), green: clampColor(match[2]), blue: clampColor(match[3]), alpha: clampAlpha(match[4] !== undefined ? Number(match[4]) : 1) }

  return null
}

function normalizeColor(colorValue: unknown, fallbackColor: string, preferArgb: boolean) {
  if (typeof colorValue === "number") return intToCssColor(colorValue, preferArgb) ?? fallbackColor
  const raw = colorValue?.toString().trim() ?? ""
  if (! raw) return fallbackColor

  const named = MINECRAFT_COLORS[raw.toLowerCase()]
  if (named) return named

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return raw
  if (/^0x[0-9a-f]{6}$/i.test(raw)) return `#${ raw.slice(2) }`
  if (/^0x[0-9a-f]{8}$/i.test(raw)) return argbToRgba(parseInt(raw.slice(2), 16))
  if (/^-?\d+$/.test(raw)) return intToCssColor(Number(raw), preferArgb) ?? fallbackColor
  if (typeof CSS !== "undefined" && CSS.supports?.("color", raw)) return raw

  return fallbackColor
}

function resolveComponentStyle(component: JsonRecord, inherited: ComponentStyle): ComponentStyle {
  const shadowValue = component.shadowColor ?? component.shadow_color
  let explicitShadowColor = inherited.explicitShadowColor
  if (shadowValue !== undefined) {
    if (shadowValue === null || shadowValue === "") explicitShadowColor = null
    else if (typeof shadowValue === "string" && shadowValue.trim().toLowerCase() === "reset") explicitShadowColor = null
    else explicitShadowColor = normalizeColor(shadowValue, inherited.explicitShadowColor ?? "#3f3f3f", true)
  }

  let color = inherited.color
  if (component.color !== undefined && component.color !== null && component.color !== "") {
    if (typeof component.color === "string" && component.color.trim().toLowerCase() === "reset") color = DEFAULT_STYLE.color
    else color = normalizeColor(component.color, inherited.color, false)
  }

  return {
    color,
    bold: component.bold !== undefined ? Boolean(component.bold) : inherited.bold,
    italic: component.italic !== undefined ? Boolean(component.italic) : inherited.italic,
    underlined: component.underlined !== undefined ? Boolean(component.underlined) : inherited.underlined,
    strikethrough: component.strikethrough !== undefined ? Boolean(component.strikethrough) : inherited.strikethrough,
    shadow: component.shadow !== undefined ? Boolean(component.shadow) : inherited.shadow,
    explicitShadowColor
  }
}

function splitTextByFont(text: string) {
  const runs: Array<{ text: string; usesSymbolFont: boolean }> = []
  for (const character of Array.from(text)) {
    const codePoint = character.codePointAt(0) ?? 0
    const usesSymbolFont = ! /\s/u.test(character) && (codePoint > 0xff || EXTENDED_PICTOGRAPHIC.test(character))
    const last = runs.at(- 1)
    if (last && last.usesSymbolFont === usesSymbolFont) last.text += character
    else runs.push({ text: character, usesSymbolFont })
  }
  return runs
}

function effectiveShadowColor(style: ComponentStyle) {
  if (! style.shadow) return null
  if (style.explicitShadowColor) return style.explicitShadowColor
  const p = parseColor(style.color)
  if (! p) return "rgba(63, 63, 63, 1)"
  return `rgba(${ Math.floor(p.red * 0.25) }, ${ Math.floor(p.green * 0.25) }, ${ Math.floor(p.blue * 0.25) }, ${ formatAlpha(p.alpha) })`
}

function renderTextSpan(text: string, style: ComponentStyle, key: string): ReactNode {
  if (! text) return null

  const shadowColor = effectiveShadowColor(style)
  const textShadow = [
    style.bold ? "1px 0 0 currentColor" : null,
    shadowColor ? `2px 2px 0 ${ shadowColor }` : null
  ].filter(Boolean).join(", ")

  const textStyle: CSSProperties = {
    color: style.color,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? "italic" : "normal",
    fontSynthesis: "weight style",
    textDecoration: [ style.underlined && "underline", style.strikethrough && "line-through" ].filter(Boolean).join(" ") || "none",
    textShadow: textShadow || "none"
  }

  return (
    <span key={ key }>
      { splitTextByFont(text).map((run, index) => (
        <span key={ `${ key }-${ index }` } style={ { ...textStyle, fontFamily: run.usesSymbolFont ? SYMBOL_FONT_STACK : undefined } }>
          { run.text }
        </span>
      )) }
    </span>
  )
}

function renderComponent(component: unknown, inherited: ComponentStyle, keyPrefix: string): ReactNode[] {
  if (component === undefined || component === null) return []
  if ([ "string", "number", "boolean" ].includes(typeof component)) return [ renderTextSpan(component!.toString(), inherited, `${ keyPrefix }-text`) ]
  if (Array.isArray(component)) return component.flatMap((part, i) => renderComponent(part, inherited, `${ keyPrefix }-${ i }`))
  if (! isJsonRecord(component)) return []

  const style = resolveComponentStyle(component, inherited)
  const nodes: ReactNode[] = []

  if (component.text !== undefined && component.text !== null && component.text !== "") nodes.push(renderTextSpan(component.text.toString(), style, `${ keyPrefix }-text`))
  if (Array.isArray(component.extra)) nodes.push(...component.extra.flatMap((part, i) => renderComponent(part, style, `${ keyPrefix }-extra-${ i }`)))

  return nodes
}

function collectTextSegments(component: unknown, inherited: ComponentStyle, segments: MinecraftTextSegment[]) {
  if (component === undefined || component === null) return
  if ([ "string", "number", "boolean" ].includes(typeof component)) {
    for (const run of splitTextByFont(component!.toString())) segments.push({
      bold: inherited.bold, color: inherited.color, italic: inherited.italic,
      shadowColor: effectiveShadowColor(inherited), strikethrough: inherited.strikethrough,
      text: run.text, underlined: inherited.underlined,
      fontFamily: run.usesSymbolFont ? SYMBOL_FONT_STACK : undefined
    })
    return
  }
  if (Array.isArray(component)) {
    for (const part of component) collectTextSegments(part, inherited, segments);
    return
  }
  if (! isJsonRecord(component)) return

  const style = resolveComponentStyle(component, inherited)

  if (component.text !== undefined && component.text !== null && component.text !== "") {
    for (const run of splitTextByFont(component.text.toString())) segments.push({
      bold: style.bold, color: style.color, italic: style.italic,
      shadowColor: effectiveShadowColor(style), strikethrough: style.strikethrough,
      text: run.text, underlined: style.underlined,
      fontFamily: run.usesSymbolFont ? SYMBOL_FONT_STACK : undefined
    })
  }

  if (Array.isArray(component.extra)) for (const part of component.extra) collectTextSegments(part, style, segments)
}

function getPlainComponentText(component: unknown): string {
  if (component === undefined || component === null) return ""
  if ([ "string", "number", "boolean" ].includes(typeof component)) return component!.toString()
  if (Array.isArray(component)) return component.map(getPlainComponentText).join("")
  if (! isJsonRecord(component)) return ""
  return [
    component.text !== undefined && component.text !== null ? component.text.toString() : "",
    Array.isArray(component.extra) ? component.extra.map(getPlainComponentText).join("") : ""
  ].join("")
}

function withParsed<T>(rawText: string, fn: (component: unknown) => T): T {
  const text = rawText.trim()
  if (! text.startsWith("{") && ! text.startsWith("[")) return fn(text)
  try {
    return fn(JSON.parse(text) as unknown)
  }
  catch {
    return fn(text)
  }
}

export function getPlainMinecraftText(rawText: string) {
  const text = rawText.trim()
  if (! text) return ""
  return withParsed(text, getPlainComponentText).replace(/&#[0-9a-f]{6}/gi, "").replace(/[&§][0-9a-fklmnor]/gi, "")
}

export function renderMinecraftText(rawText: string): ReactNode {
  const text = rawText.trim()
  if (! text) return null
  return withParsed(text, (c) => renderComponent(c, DEFAULT_STYLE, text.startsWith("{") || text.startsWith("[") ? "json" : "raw"))
}

export function parseMinecraftTextSegments(rawText: string) {
  const text = rawText.trim()
  const segments: MinecraftTextSegment[] = []
  if (! text) return segments
  withParsed(text, (c) => collectTextSegments(c, DEFAULT_STYLE, segments))
  return segments
}