import { generateOutput, rgbDefaults } from "@birdflop/rgbirdflop"
import { isJsonRecord } from "../utils"

export type ColorStop = { hex: string, pos: number }

export interface NameSegment {
  text: string
  colors: ColorStop[]
  shadowColors: ColorStop[]
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
}

const readColorStops = (value: unknown): ColorStop[] => {
  if (! Array.isArray(value)) return []
  return value.filter((stop): stop is ColorStop => isJsonRecord(stop) && typeof stop.hex === "string" && typeof stop.pos === "number")
}

const readFlag = (value: unknown) => value === true ? true : undefined

export const readNameSegments = (value: unknown): NameSegment[] => {
  if (! Array.isArray(value)) return []

  return value.filter(isJsonRecord).filter((segment) => typeof segment.text === "string" && segment.text).map((segment) => ({
    text: segment.text as string,
    colors: readColorStops(segment.colors),
    shadowColors: readColorStops(segment.shadowColors),
    bold: readFlag(segment.bold),
    italic: readFlag(segment.italic),
    underlined: readFlag(segment.underlined),
    strikethrough: readFlag(segment.strikethrough),
    obfuscated: readFlag(segment.obfuscated)
  }))
}

// The generator holds a single gradient, so a name made of several segments is flattened into the first one's style.
export const flattenSegments = (segments: NameSegment[]): NameSegment | null => {
  const first = segments[0]
  if (! first) return null

  return {
    text: segments.map((segment) => segment.text).join(""),
    colors: [ ...first.colors ],
    shadowColors: [ ...first.shadowColors ],
    bold: first.bold === true,
    italic: first.italic === true
  }
}

// Same rgbirdflop settings the server renders with, so this matches what players see in game.
const renderSegment = (segment: NameSegment): unknown[] => {
  if (segment.colors.length === 0) return [ { text: segment.text } ]

  const output = generateOutput({
    ...rgbDefaults,
    text: segment.text,
    format: { color: "JSON" },
    colors: segment.colors,
    shadowcolors: segment.shadowColors.length > 0 ? segment.shadowColors : null,
    bold: segment.bold === true,
    italic: segment.italic === true,
    underline: segment.underlined === true,
    strikethrough: segment.strikethrough === true,
    obfuscate: segment.obfuscated === true,
    gradientType: "rgb",
    disperse: false
  })

  const parsed = JSON.parse(output) as unknown
  return isJsonRecord(parsed) && Array.isArray(parsed.extra) ? parsed.extra : []
}

/** The text component json players see, or an empty string when there's no custom name. */
export const renderName = (segments: NameSegment[]) => {
  if (segments.length === 0) return ""
  return JSON.stringify({ text: "", extra: segments.flatMap(renderSegment) })
}
