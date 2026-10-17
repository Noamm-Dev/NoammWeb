import NoammApi from "./NoammApi"
import type { SliderConfig } from "../types/profile"
import type { DatabaseOwner } from "../types/DatabaseEntry"

export interface BadgeData {
  codepoint: number
  image: string
}

export interface WebConfig {
  size: { min: number, max: number, minAbs: number }
  name: { maxLength: number, bannedCharacters: string }
  permissions: string[]
}

class SiteConfig {
  private config: WebConfig | null = null
  private loading: Promise<void> | null = null
  private badgeData: Record<string, BadgeData> = {}
  private cachedDefaultOwner: DatabaseOwner | null = null
  private readonly SLIDER_STEP = 0.01

  load() {
    this.loading ??= Promise.all([ NoammApi.getWebConfig(), NoammApi.getBadges() ]).then(([ config, badges ]) => {
      this.config = config
      this.badgeData = badges
    })
    return this.loading
  }

  get badges() {
    return Object.keys(this.badgeData)
  }

  badgeImage(badge: string) {
    const data = this.badgeData[badge]
    if (! data) return null
    return `data:image/png;base64,${ data.image }`
  }

  get sliderConfig(): SliderConfig {
    return { min: this.loaded.size.min, max: this.loaded.size.max, step: this.SLIDER_STEP }
  }

  get minAbsoluteSize() {
    return this.loaded.size.minAbs
  }

  get nameRules() {
    return this.loaded.name
  }

  get permissions() {
    return this.loaded.permissions
  }

  // cached so it stays referentially stable when used as a default prop / effect dependency
  get defaultOwner(): DatabaseOwner {
    this.cachedDefaultOwner ??= Object.fromEntries(this.permissions.map((permission) => [ permission, false ]))
    return this.cachedDefaultOwner
  }

  private get loaded() {
    if (! this.config) throw new Error("SiteConfig was used before it was loaded.")
    return this.config
  }
}

export default new SiteConfig()
