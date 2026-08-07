import AuthSession from "./AuthSession"
import MinecraftApi from "./MinecraftApi"
import type { MeResponse, ProfilePlayer } from "../types/profile"
import { isJsonRecord } from '../utils.ts'
import DatabaseEntry, { type DatabaseData, type DatabaseOwner, databaseOwnerFromUnknown, databaseOwnersFromUnknown } from '../types/DatabaseEntry.ts'

type McIdVerifyResponse = | { authenticated: false } | { authenticated: true, authorized: false, error: string } | {
  apiKey: string
  expiresIn: number
  authenticated: true
  authorized: true
  player: ProfilePlayer
}

export class NoammApiError extends Error {
  readonly details: unknown
  readonly status: number

  constructor(status: number, message: string, details: unknown) {
    super(message)
    this.name = "NoammApiError"
    this.status = status
    this.details = details
  }
}

class NoammApi {
  readonly baseURL = "https://api.noamm.org"
  readonly authConfig = { codeLength: 6, codeTTL: 300 }

  async requestMcIdCode(uuid: string) {
    await this.requestText(`/auth/mc-id/${ encodeURIComponent(uuid) }/request`, { method: "GET" })
  }

  async verifyMcIdCode(uuid: string, code: string): Promise<McIdVerifyResponse> {
    const data = await this.request(`/auth/mc-id/${ encodeURIComponent(uuid) }/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    })

    if (! isJsonRecord(data)) return { authenticated: false }

    const apiKey = data.token as string
    const expiresIn = Number(data.expiresIn)
    const username = data.username as string
    const playerUuid = MinecraftApi.dashedUUID(data.userId as string)
    const hasName = data.hasName as boolean
    const hasSize = data.hasSize as boolean

    if (! apiKey || ! playerUuid || ! Number.isFinite(expiresIn) || expiresIn <= 0) return { authenticated: false }

    return {
      authenticated: true,
      apiKey,
      expiresIn: expiresIn,
      authorized: true,
      player: {
        aliases: username ? [ username ] : [],
        displayName: null,
        scale: null,
        username: username,
        uuid: playerUuid,
        hasName,
        hasSize
      }
    }
  }

  async fetchMe() {
    const session = AuthSession.read()
    if (! session) return { authenticated: false } satisfies MeResponse

    let data: DatabaseEntry
    try {
      data = await this.request("/database/web/get", {
        method: "GET", headers: { "Auth-Token": session.apiKey }
      })
    }
    catch (error) {
      if (error instanceof NoammApiError && (error.status === 401 || error.status === 403)) {
        AuthSession.clear()
        throw error
      }

      data = new DatabaseEntry()
    }

    const databaseEntry = DatabaseEntry.fromUnknown(data)

    return {
      authenticated: true,
      authUser: null,
      authorized: true,
      databaseEntry,
      player: databaseEntry.toProfilePlayer(session.player)
    } satisfies MeResponse
  }

  async updateEntry(updated: DatabaseEntry) {
    const session = AuthSession.read()
    if (! session) throw new NoammApiError(401, "Your session expired.", null)

    const data = await this.request("/database/web/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Auth-Token": session.apiKey
      },
      body: JSON.stringify(updated.toJSON())
    })

    return DatabaseEntry.fromUnknown(data)
  }

  async getDatabase(authToken: string) {
    const database = await this.request<DatabaseData>("/database/admin", {
      method: "GET", headers: { Authorization: authToken }
    })

    database.entries = DatabaseEntry.entriesFromUnknown(database.entries)
    database.owners = databaseOwnersFromUnknown(database.owners)
    return database
  }

  async getOwner(uuid: string, authToken: string) {
    const data = await this.request(`/database/admin/owner/${ encodeURIComponent(uuid) }`, {
      method: "GET",
      headers: { "Authorization": authToken }
    })

    return databaseOwnerFromUnknown(data)
  }

  async saveEntry(uuid: string, authToken: string, entry: DatabaseEntry) {
    await this.requestText(`/database/admin/entry/${ encodeURIComponent(uuid) }`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authToken
      },
      body: JSON.stringify(entry)
    })
  }

  async saveOwner(uuid: string, authToken: string, owner: DatabaseOwner) {
    await this.requestText(`/database/admin/owner/${ encodeURIComponent(uuid) }`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authToken
      },
      body: JSON.stringify(owner)
    })
  }

  async deleteOwner(uuid: string, authToken: string) {
    await this.requestText(`/database/admin/owner/${ encodeURIComponent(uuid) }`, {
      method: "DELETE", headers: { "Authorization": authToken }
    })
  }

  async deleteEntry(uuid: string, authToken: string) {
    await this.requestText(`/database/admin/entry/${ encodeURIComponent(uuid) }`, {
      method: "DELETE", headers: { "Authorization": authToken }
    })
  }

  async clearRateLimit(uuid: string, authToken: string) {
    await this.requestText(`/database/admin/ratelimit/${ encodeURIComponent(uuid) }`, {
      method: "DELETE", headers: { "Authorization": authToken }
    })
  }

  async runUpdate(authToken: string, onMessage: (message: string) => void, signal?: AbortSignal) {
    const response = await fetch(`${ this.baseURL }/database/admin/update`, {
      method: "GET",
      headers: { "Authorization": authToken },
      signal
    })

    if (! response.ok || ! response.body) {
      const text = await response.text()
      throw new NoammApiError(response.status, text, response)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) onMessage(line)
    }

    if (buffer) onMessage(buffer)
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const text = await this.requestText(path, init)

    try {
      return JSON.parse(text) as T
    }
    catch (error) {
      throw new NoammApiError(0, "The API response is invalid.", text)
    }
  }

  private async requestText(path: string, init: RequestInit) {
    const response = await fetch(this.baseURL + path, init)
    const text = await response.text()
    if (! response.ok) throw new NoammApiError(response.status, text, response)

    return text
  }
}

export default new NoammApi()
