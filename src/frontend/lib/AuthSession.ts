import type { ProfilePlayer } from "../types/profile"

interface AuthSessionData {
  apiKey: string
  expiresAt: number
  player: ProfilePlayer
}

function isAuthSessionData(value: unknown): value is AuthSessionData {
  if (! value || typeof value !== "object") return false

  const data = value as Partial<AuthSessionData>
  return typeof data.apiKey === "string" &&
    data.apiKey.trim().length > 0 &&
    typeof data.expiresAt === "number" &&
    Number.isFinite(data.expiresAt) &&
    typeof data.player === "object" &&
    data.player !== null &&
    typeof data.player.uuid === "string" &&
    data.player.uuid.trim().length > 0
}

class AuthSession {
  private readonly STORAGE_KEY = "noamm_mcid_session"

  read(): AuthSessionData | null {
    const rawValue = window.sessionStorage.getItem(this.STORAGE_KEY)
    if (! rawValue) return null

    try {
      const data = JSON.parse(rawValue) as unknown

      if (! isAuthSessionData(data) || data.expiresAt <= Date.now()) {
        this.clear()
        return null
      }

      return data
    }
    catch {
      this.clear()
      return null
    }
  }

  save(session: AuthSessionData): AuthSessionData {
    window.sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
    return session
  }

  clear() {
    window.sessionStorage.removeItem(this.STORAGE_KEY)
  }

  updatePlayer(player: ProfilePlayer): AuthSessionData | null {
    const current = this.read()
    if (! current) return null
    return this.save({ ...current, player })
  }

  timeRemaining(): number | null {
    const session = this.read()
    if (! session) return null
    const remaining = session.expiresAt - Date.now()
    return Number.isFinite(remaining) ? Math.max(0, remaining) : null
  }
}

export default new AuthSession()
