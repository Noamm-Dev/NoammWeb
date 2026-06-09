import { type FormEvent, useEffect, useState } from "react"
import { Hash, Save, ShieldCheck, X } from "lucide-react"
import { DEFAULT_SCALE } from "../content/database"
import type { DatabaseOwner } from "../types/DatabaseEntry"
import { ActionButton } from "./ActionButton"
import { MinecraftSkinViewer } from "./MinecraftSkinViewer"
import { StatusBanner } from "./StatusBanner"
import { TextField } from "./TextField"

export interface DatabaseOwnerPayload {
  hasName: boolean
  hasSize: boolean
  uuid: string
}

interface DatabaseOwnerModalProps {
  initialOwner?: DatabaseOwner
  initialUuid?: string
  isSaving: boolean
  onClose: () => void
  onSubmit: (payload: DatabaseOwnerPayload) => Promise<string | null>
  uuidReadOnly?: boolean
}

export function DatabaseOwnerModal({ initialOwner, initialUuid = "", isSaving, onClose, onSubmit, uuidReadOnly = false }: DatabaseOwnerModalProps) {
  const [ uuid, setUuid ] = useState(initialUuid)
  const [ hasName, setHasName ] = useState(initialOwner?.hasName ?? false)
  const [ hasSize, setHasSize ] = useState(initialOwner?.hasSize ?? false)
  const [ formError, setFormError ] = useState<string | null>(null)

  const normalizedUuid = uuid.trim()
  const previewSkinUrl = `https://mc-heads.net/skin/${ encodeURIComponent(normalizedUuid || "steve") }`

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
      if (event.key === "Escape" && ! isSaving) onClose()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [ isSaving, onClose ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (! normalizedUuid) return setFormError("A Minecraft player UUID is required.")

    setFormError(null)

    const apiError = await onSubmit({
      hasName,
      hasSize,
      uuid: normalizedUuid
    })

    if (apiError) setFormError(apiError)
  }

  return (
    <div
      aria-labelledby="database-owner-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-5"
      role="dialog"
    >
      <button
        aria-label="Close owner modal"
        className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
        disabled={ isSaving }
        onClick={ onClose }
        type="button"
      />

      <section className="glass-card animate-panel-in relative z-10 max-h-[calc(100vh-2.5rem)] w-full max-w-[900px] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="gradient-text text-3xl font-extrabold leading-tight"
              id="database-owner-modal-title"
            >
              Owner
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/42">
              Add an owner permission payload.
            </p>
          </div>

          <ActionButton
            aria-label="Close"
            className="min-h-10 px-3"
            disabled={ isSaving }
            onClick={ onClose }
            variant="ghost"
          >
            <X className="h-4 w-4" aria-hidden="true"/>
          </ActionButton>
        </div>

        <form className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" onSubmit={ handleSubmit }>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="grid gap-5">
              <TextField
                autoComplete="off"
                className={ uuidReadOnly ? "cursor-not-allowed text-white/55" : "" }
                icon={ <Hash className="h-3.5 w-3.5" aria-hidden="true"/> }
                label="Minecraft Player UUID"
                onChange={ (event) => setUuid(event.target.value) }
                placeholder="7ab34814-ef33-4745-9af3-dd3fde6c57cd"
                readOnly={ uuidReadOnly }
                value={ uuid }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.06]">
                  <input
                    checked={ hasName }
                    className="h-4 w-4 accent-cyan-300"
                    onChange={ (event) => setHasName(event.target.checked) }
                    type="checkbox"
                  />
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true"/>
                    <span>hasName</span>
                  </span>
                </label>

                <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.06]">
                  <input
                    checked={ hasSize }
                    className="h-4 w-4 accent-cyan-300"
                    onChange={ (event) => setHasSize(event.target.checked) }
                    type="checkbox"
                  />
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true"/>
                    <span>hasSize</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-auto grid gap-4">
              <StatusBanner message={ formError } tone="error"/>

            <ActionButton
                className="w-full"
                disabled={ isSaving }
                icon={ <Save className="h-4 w-4" aria-hidden="true"/> }
                type="submit"
                variant="primary"
              >
                { isSaving ? "Saving..." : "Save Owner" }
              </ActionButton>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <MinecraftSkinViewer
              height={ 360 }
              nameTag={ null }
              scale={ DEFAULT_SCALE }
              skinUrl={ previewSkinUrl }
              width={ 270 }
            />
          </aside>
        </form>
      </section>
    </div>
  )
}
