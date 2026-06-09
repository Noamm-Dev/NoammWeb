import AuthSession from "./AuthSession"
import { dashedUUID } from "./minecraft-profile"
import type { MeResponse, ProfilePlayer } from "../types/profile"
import { isJsonRecord } from '../utils.ts'
import DatabaseEntry, { type DatabaseData } from '../types/DatabaseEntry.ts'

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
    const expiresIn = data.expiresIn as number
    const username = data.username as string
    const playerUuid = dashedUUID(data.userId as string)

    if (! apiKey || ! playerUuid) return { authenticated: false }

    return {
      authenticated: true,
      apiKey,
      expiresIn: expiresIn,
      authorized: true,
      player: {
        aliases: username ? [ username ] : [],
        displayName: null,
        scale: null,
        username,
        uuid: playerUuid
      }
    }
  }

  async fetchMe() {
    const session = AuthSession.read()
    if (! session) return { authenticated: false } satisfies MeResponse

    const data = await this.request("/database/web/get", {
      method: "GET", headers: { "Auth-Token": session.apiKey }
    })

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
    return database
  }

  async saveEntry(uuid: string, authToken: string, entry: DatabaseEntry) {
    await this.requestText(`/database/admin/${ encodeURIComponent(uuid) }`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authToken
      },
      body: JSON.stringify(entry)
    })
  }

  async deleteEntry(uuid: string, authToken: string) {
    await this.requestVoid(`/database/admin/${ encodeURIComponent(uuid) }`, {
      method: "DELETE", headers: { "Authorization": authToken }
    })
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const text = await this.requestText(path, init)

    try {
      return JSON.parse(text) as T
    }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    catch (error) {
      throw new NoammApiError(0, "The API response is invalid.", text)
    }
  }

  private async requestVoid(path: string, init: RequestInit) {
    await this.requestText(path, init)
  }

  private async requestText(path: string, init: RequestInit) {
    const response = await fetch(this.baseURL + path, init)
    const text = await response.text()
    if (! response.ok) throw new NoammApiError(response.status, text, response)

    return text
  }
}

export default new NoammApi()
