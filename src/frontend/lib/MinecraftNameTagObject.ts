import { CanvasTexture, NearestFilter, Sprite, SpriteMaterial } from "three"
import { getPlainMinecraftText, parseMinecraftTextSegments } from "./minecraft-text"

interface MinecraftNameTagOptions {
  backgroundStyle?: string | CanvasGradient | CanvasPattern
  fontFamily?: string
  fontSize?: number
  height?: number
  margin?: [ number, number, number, number ]
  repaintAfterLoaded?: boolean
}

const RENDER_SCALE = 4
const BOLD_PASSES = 8
const DEFAULT_FONT = '"Minecraft", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans Symbols", "Arial Unicode MS", "Fira Code", SFMono-Regular, Menlo, monospace'

export class MinecraftNameTagObject extends Sprite {
  readonly painted: Promise<void>
  private readonly backgroundStyle: string | CanvasGradient | CanvasPattern
  private readonly fontFamily: string
  private readonly fontSize: number
  private readonly heightValue: number
  private readonly margin: [ number, number, number, number ]
  private readonly text: string
  private readonly textMaterial: SpriteMaterial

  constructor(text = "", options: MinecraftNameTagOptions = {}) {
    const material = new SpriteMaterial({ alphaTest: 1e-5, transparent: true })
    super(material)

    this.backgroundStyle = options.backgroundStyle ?? "rgba(0, 0, 0, 0.35)"
    this.fontFamily = options.fontFamily ?? DEFAULT_FONT
    this.fontSize = options.fontSize ?? 48
    this.heightValue = options.height ?? 4
    this.margin = options.margin ?? [ 5, 10, 5, 10 ]
    this.text = text
    this.textMaterial = material

    this.paint()

    const plainText = getPlainMinecraftText(text) || " "
    const fontProbe = `${ this.fontSize }px ${ this.fontFamily }`

    if ((options.repaintAfterLoaded ?? this.fontFamily.includes("Minecraft")) && ! document.fonts.check(fontProbe, plainText)) {
      this.painted = document.fonts.load(fontProbe, plainText).then(() => this.paint())
    }
    else this.painted = Promise.resolve()
  }

  disposeTag() {
    this.textMaterial.map?.dispose()
    this.textMaterial.dispose()
  }

  private paint() {
    const canvas = document.createElement("canvas")
    const measureCtx = canvas.getContext("2d")
    if (! measureCtx) return

    const segments = parseMinecraftTextSegments(this.text)
    const printable = segments.length > 0 ? segments : parseMinecraftTextSegments(getPlainMinecraftText(this.text) || " ")

    const measured = printable.map((segment) => {
      measureCtx.font = `${ segment.italic ? "italic " : "" }${ segment.bold ? "bold " : "" }${ this.fontSize }px ${ segment.fontFamily ?? this.fontFamily }`
      const metrics = measureCtx.measureText(segment.text)
      return { metrics, renderedWidth: metrics.width + (segment.bold ? BOLD_PASSES : 0), segment }
    })

    const textWidth = measured.reduce((sum, s) => sum + s.renderedWidth, 0)
    const ascent = measured.reduce((max, s) => Math.max(max, s.metrics.actualBoundingBoxAscent || this.fontSize), this.fontSize)
    const descent = measured.reduce((max, s) => Math.max(max, s.metrics.actualBoundingBoxDescent || this.fontSize * 0.2), this.fontSize * 0.2)

    const logicalWidth = Math.ceil(this.margin[3] + textWidth + this.margin[1] + 4)
    const logicalHeight = Math.ceil(this.margin[0] + ascent + descent + this.margin[2] + 4)

    canvas.width = Math.max(1, logicalWidth * RENDER_SCALE)
    canvas.height = Math.max(1, logicalHeight * RENDER_SCALE)

    const ctx = canvas.getContext("2d")
    if (! ctx) return

    ctx.scale(RENDER_SCALE, RENDER_SCALE)
    ctx.textBaseline = "alphabetic"
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = this.backgroundStyle
    ctx.fillRect(0, 0, logicalWidth, logicalHeight)

    let cursorX = this.margin[3] + 2
    const baselineY = this.margin[0] + ascent + 1

    for (const { renderedWidth, segment } of measured) {
      ctx.font = `${ segment.italic ? "italic " : "" }${ segment.bold ? "bold " : "" }${ this.fontSize }px ${ segment.fontFamily ?? this.fontFamily }`

      if (segment.shadowColor) {
        ctx.fillStyle = segment.shadowColor
        ctx.fillText(segment.text, cursorX + 2, baselineY + 2)
      }

      ctx.fillStyle = segment.color
      ctx.fillText(segment.text, cursorX, baselineY)

      if (segment.bold) {
        for (let offset = 1; offset <= BOLD_PASSES; offset ++) {
          ctx.fillText(segment.text, cursorX + offset, baselineY)
        }
      }

      if (segment.underlined) {
        ctx.fillStyle = segment.color
        ctx.fillRect(cursorX, baselineY + 3, renderedWidth, 2)
      }

      if (segment.strikethrough) {
        ctx.fillStyle = segment.color
        ctx.fillRect(cursorX, baselineY - ascent * 0.35, renderedWidth, 2)
      }

      cursorX += renderedWidth
    }

    this.textMaterial.map?.dispose()
    const texture = new CanvasTexture(canvas)
    texture.magFilter = NearestFilter
    texture.minFilter = NearestFilter
    texture.generateMipmaps = false
    this.textMaterial.map = texture
    this.textMaterial.needsUpdate = true
    this.scale.x = (canvas.width / canvas.height) * this.heightValue
    this.scale.y = this.heightValue
  }
}