import type { ButtonHTMLAttributes, ReactNode } from "react"

type ActionButtonVariant = "primary" | "secondary" | "danger" | "ghost"

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  primary: "border-cyan-300/30 bg-cyan-400/15 text-white hover:border-cyan-200/70 hover:bg-cyan-400/25 focus:ring-cyan-300/25",
  secondary: "border-white/10 bg-white/[0.05] text-white hover:border-white/30 hover:bg-white/[0.08] focus:ring-white/15",
  danger: "border-red-400/25 bg-red-500/10 text-red-100 hover:border-red-300/60 hover:bg-red-500/20 focus:ring-red-300/20",
  ghost: "border-transparent bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white focus:ring-white/10"
}

export function ActionButton({
  children,
  className = "",
  icon,
  variant = "secondary",
  type = "button",
  ...buttonProps
}: ActionButtonProps) {
  return (
    <button
      className={ `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${ VARIANT_CLASSES[variant] } ${ className }` }
      type={ type }
      { ...buttonProps }
    >
      { icon ? (
        <span className="grid h-4 w-4 place-items-center">{ icon }</span>
      ) : null }
      { children !== undefined && children !== null ? (
        <span>{ children }</span>
      ) : null }
    </button>
  )
}