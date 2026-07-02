export type NotificationTone = "error" | "success" | "info"

export const TONE_CLASSES: Record<NotificationTone, string> = {
  error: "border-red-400/30 bg-red-500/15 text-red-50 shadow-red-950/20",
  success: "border-emerald-300/30 bg-emerald-400/15 text-emerald-50 shadow-emerald-950/20",
  info: "border-cyan-300/30 bg-cyan-400/15 text-cyan-50 shadow-cyan-950/20"
}

export interface NotificationPayload {
  message: string | null
  tone?: NotificationTone
}

export interface AppNotification {
  createdAt: number
  id: number
  message: string
  tone: NotificationTone
}

class NotificationManager {
  private notifications: AppNotification[] = []
  private notificationTimeouts = new Map<number, number>()
  private subscribers = new Set<() => void>()
  private lastNotification: AppNotification | null = null
  private nextNotificationId = 0
  private readonly NOTIFICATION_TTL_MS = 5000
  private readonly DUPLICATE_WINDOW_MS = 250

  get = () => this.notifications

  remove = (id: number) => this.set(this.notifications.filter((notification) => notification.id !== id))

  register = (listener: () => void) => {
    this.subscribers.add(listener)
    listener()
    return () => {
      this.subscribers.delete(listener)
    }
  }

  notify = ({ message, tone = "info" }: NotificationPayload) => {
    const normalizedMessage = message?.trim()
    if (! normalizedMessage) return

    const now = Date.now()

    if (
      this.lastNotification?.message === normalizedMessage &&
      this.lastNotification?.tone === tone &&
      now - this.lastNotification.createdAt < this.DUPLICATE_WINDOW_MS
    ) return

    this.nextNotificationId += 1

    const notification: AppNotification = {
      createdAt: now,
      id: this.nextNotificationId,
      message: normalizedMessage,
      tone
    }

    this.lastNotification = notification
    this.set([ ...this.notifications, notification ].slice(- 4))
    this.notificationTimeouts.set(notification.id, window.setTimeout(() => this.remove(notification.id), this.NOTIFICATION_TTL_MS))
  }

  private set(nextNotifications: AppNotification[]) {
    const nextIds = new Set(nextNotifications.map(notification => notification.id))

    for (const notification of this.notifications) {
      if (! nextIds.has(notification.id)) {
        const timeoutId = this.notificationTimeouts.get(notification.id)
        if (! timeoutId) continue
        window.clearTimeout(timeoutId)
        this.notificationTimeouts.delete(notification.id)
      }
    }

    this.notifications = nextNotifications
    for (const subscriber of this.subscribers) subscriber()
  }
}

export default new NotificationManager()