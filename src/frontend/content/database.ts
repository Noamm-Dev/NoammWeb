import type { Scale, SliderConfig } from '../types/profile'

export const STORAGE_KEY = "noamm_database_admin_password"
export const SLIDER_CONFIG: SliderConfig = { min: - 3, max: 3, step: 0.1 } as const
export const DEFAULT_SCALE: Scale = { x: 1, y: 1, z: 1 }
export const SCALE_AXES = [ "x", "y", "z" ] as const