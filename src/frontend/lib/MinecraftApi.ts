export interface MinecraftProfile {
  name: string,
  uuid: string
}

class MinecraftApi {
  private readonly cache = new Map<string, MinecraftProfile | null>()
  private readonly api = "https://playerdb.co/api/player/minecraft/"

  normalizeUuid(value: string) {
    return value.trim().replace(/-/g, "").toLowerCase()
  }

  isMinecraftUuid(value: string) {
    return /^[0-9a-f]{32}$/i.test(this.normalizeUuid(value))
  }

  isMinecraftUsername(value: string) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(value.trim())
  }

  dashedUUID(raw: string) {
    const uuid = this.normalizeUuid(raw)
    if (! /^[0-9a-f]{32}$/.test(uuid)) return null
    return `${ uuid.slice(0, 8) }-${ uuid.slice(8, 12) }-${ uuid.slice(12, 16) }-${ uuid.slice(16, 20) }-${ uuid.slice(20) }`
  }

  async getPlayer(username: string, signal?: AbortSignal) {
    const normalized = username.trim().toLowerCase()
    if (! this.isMinecraftUsername(normalized)) return null
    if (this.cache.has(normalized)) return this.cache.get(normalized)!

    const response = await fetch(`${ this.api + encodeURIComponent(normalized) }`, { signal })
    if (response.status === 404 || response.status === 204) {
      this.cache.set(normalized, null)
      return null
    }

    if (! response.ok) throw new Error("Minecraft username lookup failed.")

    const player = (await response.json()).data?.player
    if (typeof player?.id !== "string" || typeof player?.username !== "string") {
      throw new Error("Minecraft username lookup failed.")
    }

    const lookup = { name: player.username, uuid: player.id }
    this.cache.set(normalized, lookup)
    return lookup
  }
}

export default new MinecraftApi()