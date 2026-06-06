import type { ProfilePlayer } from "../types/profile"

interface AuthSessionData {
  apiKey: string
  expiresAt: number
  player: ProfilePlayer
}

class AuthSession {
  private readonly STORAGE_KEY = "noamm_mcid_session"

  read(): AuthSessionData | null {
    const rawValue = window.localStorage.getItem(this.STORAGE_KEY)
    if (! rawValue) return null

    try {
      const data = JSON.parse(rawValue) as AuthSessionData

      if (data.expiresAt <= Date.now()) {
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
    window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session))
    return session
  }

  clear() {
    window.localStorage.removeItem(this.STORAGE_KEY)
  }

  updatePlayer(player: ProfilePlayer): AuthSessionData | null {
    const current = this.read()
    if (! current) return null
    return this.save({ ...current, player })
  }

  timeRemaining(): number | null {
    const session = this.read()
    if (! session) return null
    return Math.max(0, session.expiresAt - Date.now())
  }
}

export default new AuthSession()