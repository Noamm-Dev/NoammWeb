import { useEffect } from "react"
import { Database, UserRound, X } from "lucide-react"
import { ActionButton } from "./ActionButton"

interface DatabaseAddChoiceModalProps {
  onClose: () => void
  onSelectEntry: () => void
  onSelectOwner: () => void
}

export function DatabaseAddChoiceModal({ onClose, onSelectEntry, onSelectOwner }: DatabaseAddChoiceModalProps) {
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [ onClose ])

  return (
    <div
      aria-labelledby="database-add-choice-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-5"
      role="dialog"
    >
      <button
        aria-label="Close add menu"
        className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
        onClick={ onClose }
        type="button"
      />

      <section className="glass-card animate-panel-in relative z-10 w-full max-w-[560px] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="gradient-text text-3xl font-extrabold leading-tight"
              id="database-add-choice-title"
            >
              Add
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/42">
              Choose what you want to create.
            </p>
          </div>

          <ActionButton
            aria-label="Close"
            className="min-h-10 px-3"
            onClick={ onClose }
            variant="ghost"
          >
            <X className="h-4 w-4" aria-hidden="true"/>
          </ActionButton>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition duration-200 hover:border-cyan-300/35 hover:bg-cyan-400/[0.08] focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
            onClick={ onSelectEntry }
            type="button"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <Database className="h-5 w-5" aria-hidden="true"/>
            </span>
            <span className="mt-4 block text-lg font-extrabold text-white">Entry</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-white/42">
              Add a regular database player entry.
            </span>
          </button>

          <button
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition duration-200 hover:border-cyan-300/35 hover:bg-cyan-400/[0.08] focus:outline-none focus:ring-4 focus:ring-cyan-300/15"
            onClick={ onSelectOwner }
            type="button"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <UserRound className="h-5 w-5" aria-hidden="true"/>
            </span>
            <span className="mt-4 block text-lg font-extrabold text-white">Owner</span>
            <span className="mt-1 block text-sm font-semibold leading-5 text-white/42">
              Prepare owner permissions for name and size.
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}
