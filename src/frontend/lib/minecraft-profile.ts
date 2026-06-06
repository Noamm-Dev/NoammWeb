export interface MinecraftProfileLookup {
  name: string,
  uuid: string
}

interface PlayerDbMinecraftPlayer {
  id?: unknown
  username?: unknown
}

const usernameCache = new Map<string, MinecraftProfileLookup | null>()

export const normalizeUuid = (value: string) => value.trim().replace(/-/g, "").toLowerCase()
export const isMinecraftUuid = (value: string) => /^[0-9a-f]{32}$/i.test(normalizeUuid(value))
export const isMinecraftUsername = (value: string) => /^[a-zA-Z0-9_]{3,16}$/.test(value.trim())

export function dashedUUID(raw: string) {
  const uuid = normalizeUuid(raw)
  if (! /^[0-9a-f]{32}$/.test(uuid)) return null
  return `${ uuid.slice(0, 8) }-${ uuid.slice(8, 12) }-${ uuid.slice(12, 16) }-${ uuid.slice(16, 20) }-${ uuid.slice(20) }`
}

export async function lookupMinecraftUsername(username: string, signal?: AbortSignal) {
  const normalized = username.trim().toLowerCase()
  if (! isMinecraftUsername(normalized)) return null
  if (usernameCache.has(normalized)) return usernameCache.get(normalized)!

  const response = await fetch(`https://playerdb.co/api/player/minecraft/${ encodeURIComponent(normalized) }`, { signal })
  if (response.status === 404 || response.status === 204) {
    usernameCache.set(normalized, null)
    return null
  }

  if (! response.ok) throw new Error("Minecraft username lookup failed.")

  const payload = await response.json() as { data?: { player?: PlayerDbMinecraftPlayer } }
  const player = payload.data?.player

  if (typeof player?.id !== "string" || typeof player?.username !== "string") {
    throw new Error("Minecraft username lookup failed.")
  }

  const uuid = player.id
  if (! uuid) throw new Error("Minecraft username lookup failed.")

  const lookup = { name: player.username, uuid }
  usernameCache.set(normalized, lookup)
  return lookup
}