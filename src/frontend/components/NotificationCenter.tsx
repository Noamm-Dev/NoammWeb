import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { useEffect, useState } from "react"
import { type AppNotification, dismissNotification, getNotifications, subscribeNotifications, TONE_CLASSES } from "../lib/notifications"

export function NotificationCenter() {
  const [ notifications, setNotifications ] = useState<AppNotification[]>(getNotifications)
  useEffect(() => subscribeNotifications(() => setNotifications(getNotifications())), [])
  if (notifications.length === 0) return null

  return (
    <div className="notification-center pointer-events-none fixed right-4 top-4 z-[100] grid w-[min(420px,calc(100vw-2rem))] gap-3">
      { notifications.map((notification) => {
        const Icon = notification.tone === "error" ? AlertCircle : notification.tone === "success" ? CheckCircle2 : Info;

        return (
          <div
            className={ `pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl animate-panel-in ${ TONE_CLASSES[notification.tone] }` }
            key={ notification.id }
            role={ notification.tone === "error" ? "alert" : "status" }
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>
            <p className="min-w-0 flex-1 leading-5">{ notification.message }</p>
            <button
              aria-label="Close notification"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
              onClick={ () => dismissNotification(notification.id) }
              type="button"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true"/>
            </button>
          </div>
        )
      }) }
    </div>
  )
}