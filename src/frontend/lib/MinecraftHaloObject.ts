import { BoxGeometry, Group, Mesh, MeshBasicMaterial, SRGBColorSpace } from "three"

const HALO_PIXELS: Array<[ number, number ]> = [
  [ - 2, - 6 ], [ 1, 5 ], [ 0, 5 ], [ - 1, 5 ], [ - 2, 5 ], [ - 2, 4 ], [ - 3, 4 ], [ - 4, 4 ], [ - 4, 3 ], [ - 5, 3 ], [ - 5, 2 ], [ - 5, 1 ],
  [ - 6, 1 ], [ - 6, - 2 ], [ - 6, - 1 ], [ 1, 4 ], [ 2, 4 ], [ 3, 4 ], [ 3, 3 ], [ 4, 3 ], [ 4, 2 ], [ 4, 1 ], [ 5, 1 ], [ 5, 0 ], [ 5, - 1 ],
  [ 5, - 2 ], [ - 6, 0 ], [ - 5, - 2 ], [ - 5, - 3 ], [ - 5, - 4 ], [ - 4, - 4 ], [ - 4, - 5 ], [ - 3, - 5 ], [ - 2, - 5 ], [ 4, - 2 ],
  [ 4, - 3 ], [ 4, - 4 ], [ 3, - 4 ], [ 3, - 5 ], [ 2, - 5 ], [ 1, - 5 ], [ 1, - 6 ], [ 0, - 6 ], [ - 1, - 6 ]
]

// skinview3d models are built at 1 unit = 1 pixel with the head top at y = 8
const BASE_Y = 17
const BOB_PERIOD_MS = 2000
const BOB_RANGE_BLOCKS = 0.16
const BOB_AMPLITUDE_PX = BOB_RANGE_BLOCKS * 16

export class MinecraftHaloObject extends Group {
  private readonly geometry = new BoxGeometry(1, 1, 1)
  private readonly material = new MeshBasicMaterial()

  constructor(halo: number) {
    super()

    for (const [ x, z ] of HALO_PIXELS) {
      const pixel = new Mesh(this.geometry, this.material)
      pixel.position.set(x, 0, z)
      this.add(pixel)
    }

    this.setColor(halo)
    this.tick()
  }

  setColor(halo: number) {
    const r = (halo >> 16) & 0xFF
    const g = (halo >> 8) & 0xFF
    const b = halo & 0xFF
    const alpha = (halo >>> 24) & 0xFF
    const transparent = alpha < 0xFF

    this.material.color.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
    this.material.opacity = alpha / 255

    if (transparent !== this.material.transparent) {
      this.material.transparent = transparent
      this.material.needsUpdate = true
    }
  }

  tick() {
    const phase = (Date.now() % BOB_PERIOD_MS) / BOB_PERIOD_MS
    const bob = ((Math.sin(phase * Math.PI * 2) + 1) / 2) * BOB_AMPLITUDE_PX

    this.position.y = BASE_Y + bob
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}