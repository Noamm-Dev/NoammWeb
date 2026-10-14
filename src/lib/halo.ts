export const HALO_DEFAULT = 0xFFFFFF00 | 0
export const HALO_UNSET = 1

function toHexByte(value: number) {
  return value.toString(16).padStart(2, "0")
}

export function haloToCss(halo: number) {
  const r = (halo >> 16) & 0xFF
  const g = (halo >> 8) & 0xFF
  const b = halo & 0xFF
  const a = (halo >>> 24) & 0xFF
  return `#${ toHexByte(r) }${ toHexByte(g) }${ toHexByte(b) }${ toHexByte(a) }`.toUpperCase()
}

export function haloRgbToCss(halo: number) {
  const r = (halo >> 16) & 0xFF
  const g = (halo >> 8) & 0xFF
  const b = halo & 0xFF
  return `#${ toHexByte(r) }${ toHexByte(g) }${ toHexByte(b) }`.toUpperCase()
}

export function haloToRgba(halo: number) {
  const r = (halo >> 16) & 0xFF
  const g = (halo >> 8) & 0xFF
  const b = halo & 0xFF
  const a = (halo >>> 24) & 0xFF
  return `rgba(${ r }, ${ g }, ${ b }, ${ (a / 255).toFixed(3) })`
}

export function cssRgbToHalo(css: string, alpha: number) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(css.trim())
  if (! match) return null

  const r = parseInt(match[1].slice(0, 2), 16)
  const g = parseInt(match[1].slice(2, 4), 16)
  const b = parseInt(match[1].slice(4, 6), 16)
  const clampedAlpha = Math.max(0, Math.min(255, Math.round(alpha)))

  return ((clampedAlpha << 24) | (r << 16) | (g << 8) | b) | 0
}
