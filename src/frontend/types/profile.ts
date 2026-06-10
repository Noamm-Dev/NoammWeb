import DatabaseEntry from './DatabaseEntry.ts'

export interface Scale {
  x: number,
  y: number,
  z: number
}

export interface SliderConfig {
  min: number,
  max: number,
  step: number
}

export interface ProfilePlayer {
  aliases: string[]
  displayName: string | null
  scale: Scale | null
  username: string | null
  uuid: string
}

export interface AuthUser {
  email?: string | null
  id?: string
  minecraftUsername?: string
  minecraftUuid?: string
  name?: string
}

export interface MeUnavailableResponse {
  authenticated: false
  error: string
  unavailable: true
}

export interface MeUnauthenticatedResponse {
  authenticated: false
  unavailable?: false
}

export interface MeUnauthorizedResponse {
  authenticated: true
  authorized: false
  error: string
}

export interface MeAuthorizedResponse {
  authenticated: true
  apiKey?: string
  apiKeyExpiresAt?: string
  apiKeyExpiresInSeconds?: number
  authUser: AuthUser | null
  authorized: true
  player: ProfilePlayer
  databaseEntry: DatabaseEntry
}

export type MeResponse = | MeUnavailableResponse | MeUnauthenticatedResponse | MeUnauthorizedResponse | MeAuthorizedResponse