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

let notifications: AppNotification[] = []
const notificationTimeouts = new Map<number, number>()
const subscribers = new Set<() => void>()

let lastNotification: AppNotification | null = null
let nextNotificationId = 0

const NOTIFICATION_TTL_MS = 4200
const DUPLICATE_WINDOW_MS = 250

export const getNotifications = () => notifications
export const dismissNotification = (id: number) => setNotifications(notifications.filter((notification) => notification.id !== id))
export const subscribeNotifications = (listener: () => void) => {
  subscribers.add(listener)
  listener()
  return () => {
    subscribers.delete(listener)
  }
}

function setNotifications(nextNotifications: AppNotification[]) {
  const nextIds = new Set(nextNotifications.map((notification) => notification.id))

  for (const notification of notifications) {
    if (! nextIds.has(notification.id)) {
      const timeoutId = notificationTimeouts.get(notification.id)
      if (! timeoutId) continue
      window.clearTimeout(timeoutId)
      notificationTimeouts.delete(notification.id)
    }
  }

  notifications = nextNotifications
  for (const subscriber of subscribers) subscriber()
}

export function notify({ message, tone = "info" }: NotificationPayload) {
  const normalizedMessage = message?.trim()
  if (! normalizedMessage) return

  const now = Date.now()

  if (
    lastNotification?.message === normalizedMessage &&
    lastNotification?.tone === tone &&
    now - lastNotification.createdAt < DUPLICATE_WINDOW_MS
  ) return

  nextNotificationId += 1

  const notification: AppNotification = {
    createdAt: now,
    id: nextNotificationId,
    message: normalizedMessage,
    tone
  }

  lastNotification = notification
  setNotifications([ ...notifications, notification ].slice(- 4))
  notificationTimeouts.set(notification.id, window.setTimeout(() => dismissNotification(notification.id), NOTIFICATION_TTL_MS))
}