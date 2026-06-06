import { type NotificationTone, TONE_CLASSES } from '../lib/notifications'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

interface StatusBannerProps {
  message: string | null;
  tone?: NotificationTone;
}

export function StatusBanner({ message, tone = "info" }: StatusBannerProps) {
  if (! message) return null;
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;

  return (
    <div
      className={ `flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${ TONE_CLASSES[tone] }` }
      role={ tone === "error" ? "alert" : "status" }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>
      <p>{ message }</p>
    </div>
  )
}