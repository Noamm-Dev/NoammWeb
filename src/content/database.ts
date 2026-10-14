import type { Scale, SliderConfig } from '../types/profile'
import type { DatabaseOwner } from '../types/DatabaseEntry'

export const SLIDER_CONFIG: SliderConfig = { min: - 3, max: 3, step: 0.01 } as const
export const DEFAULT_SCALE: Scale = { x: 1, y: 1, z: 1 }
export const SCALE_AXES = [ "x", "y", "z" ] as const

// Must match the Badges enum in NoammApi (controllers/database/data/badges/Badges.kt)
export const BADGES = [ "OWNER", "DEV", "SUS", "CHAIR" ] as const
export const OWNER_PERMISSIONS = [ "hasName", "hasSize", "hasHalo", "hasDragonWings", "hasBadges" ] as const satisfies ReadonlyArray<keyof DatabaseOwner>
export const DEFAULT_OWNER: DatabaseOwner = { hasName: false, hasSize: false, hasHalo: false, hasDragonWings: false, hasBadges: false }