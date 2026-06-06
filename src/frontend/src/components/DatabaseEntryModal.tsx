import { Hash, RotateCcw, Ruler, Save, Type, X } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { SLIDER_CONFIG } from "../content/database"
import DatabaseEntry from "../types/DatabaseEntry"
import { ActionButton } from "./ActionButton"
import { MinecraftSkinViewer } from "./MinecraftSkinViewer"
import { MinecraftTextPreview } from "./MinecraftTextPreview"
import { StatusBanner } from "./StatusBanner"
import { TextField } from "./TextField"

type DatabaseEntryModalMode = "add" | "edit"

interface DatabaseEntryModalProps {
  initialEntry?: DatabaseEntry
  initialUuid?: string
  isSaving: boolean
  mode: DatabaseEntryModalMode
  onClose: () => void
  onSubmit: (uuid: string, entry: DatabaseEntry) => Promise<string | null>
}

interface DatabaseFormState {
  uuid: string,
  name: string,
  sizeX: string,
  sizeY: string,
  sizeZ: string,
}

type SizeField = "sizeX" | "sizeY" | "sizeZ"

const SIZE_FIELDS = [
  { field: "sizeX", label: "Size X" },
  { field: "sizeY", label: "Size Y" },
  { field: "sizeZ", label: "Size Z" }
] satisfies Array<{ field: SizeField, label: string }>

export function DatabaseEntryModal({ initialEntry, initialUuid, isSaving, mode, onClose, onSubmit }: DatabaseEntryModalProps) {
  const [ formState, setFormState ] = useState(() => buildFormState(initialUuid, initialEntry))
  const [ formError, setFormError ] = useState<string | null>(null)

  const isEditing = mode === "edit"
  const previewScale = {
    x: parsePreviewSize(formState.sizeX),
    y: parsePreviewSize(formState.sizeY),
    z: parsePreviewSize(formState.sizeZ)
  }
  const previewNameTag = formState.name.trim() || null
  const previewSkinUrl = `https://mc-heads.net/skin/${ encodeURIComponent(formState.uuid.trim() || "steve") }`

  const updateField = (field: keyof DatabaseFormState, value: string) => setFormState((currentState) => ({ ...currentState, [field]: value }))
  const updateSizeField = (field: SizeField, value: string) => updateField(field, value.replace(/,/g, "."))
  const resetSizes = () => setFormState((currentState) => ({ ...currentState, sizeX: "1.0", sizeY: "1.0", sizeZ: "1.0" }))

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

    const uuid = formState.uuid.trim()
    const parsedSizeX = parseSize(formState.sizeX, "Size X")
    const parsedSizeY = parseSize(formState.sizeY, "Size Y")
    const parsedSizeZ = parseSize(formState.sizeZ, "Size Z")

    if (! uuid) return setFormError("A Minecraft player UUID is required.")
    if (typeof parsedSizeX === "string") return setFormError(parsedSizeX)
    if (typeof parsedSizeY === "string") return setFormError(parsedSizeY)
    if (typeof parsedSizeZ === "string") return setFormError(parsedSizeZ)

    setFormError(null)

    const apiError = await onSubmit(uuid, new DatabaseEntry(formState.name, parsedSizeX, parsedSizeY, parsedSizeZ))

    if (apiError) setFormError(apiError)
  }

  return (
    <div
      aria-labelledby="database-entry-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-5"
      role="dialog"
    >
      <button
        aria-label="Close modal"
        className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
        disabled={ isSaving }
        onClick={ onClose }
        type="button"
      />

      <section className="glass-card animate-panel-in relative z-10 max-h-[calc(100vh-2.5rem)] w-full max-w-[1040px] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="gradient-text text-3xl font-extrabold leading-tight"
              id="database-entry-modal-title"
            >
              Database Editor
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/42">
              { isEditing ? "Edit Entry" : "Add Entry" }
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <form className="grid gap-5" onSubmit={ handleSubmit }>
            <TextField
              autoComplete="off"
              className={ isEditing ? "cursor-not-allowed text-white/55" : "" }
              icon={ <Hash className="h-3.5 w-3.5" aria-hidden="true"/> }
              label="Minecraft Player UUID"
              onChange={ (event) => updateField("uuid", event.target.value) }
              placeholder="7ab34814-ef33-4745-9af3-dd3fde6c57cd"
              readOnly={ isEditing }
              value={ formState.uuid }
            />

            <TextField
              autoComplete="off"
              icon={ <Type className="h-3.5 w-3.5" aria-hidden="true"/> }
              label="Name (JSON Component)"
              onChange={ (event) => updateField("name", event.target.value) }
              placeholder='{"text":"Noamm","color":"red"}'
              value={ formState.name }
            />

            <div>
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                <Type className="h-3.5 w-3.5" aria-hidden="true"/>
                <span>Preview</span>
              </span>
              <MinecraftTextPreview
                emptyLabel="No custom name yet"
                value={ formState.name }
              />
            </div>

            <div className="h-px bg-white/10"/>

            <div className="grid gap-4 sm:grid-cols-3">
              { SIZE_FIELDS.map(({ field, label }) => (
                <div
                  className={ field === "sizeZ" ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2" : "min-w-0" }
                  key={ field }
                >
                  <div className="min-w-0">
                    <TextField
                      className="text-center font-semibold"
                      icon={ <Ruler className="h-3.5 w-3.5" aria-hidden="true"/> }
                      inputMode="decimal"
                      label={ label }
                      onChange={ (event) => updateSizeField(field, event.target.value) }
                      placeholder="1.0"
                      type="text"
                      value={ formState[field] }
                    />
                    <input
                      aria-label={ `${ label } slider` }
                      className="scale-slider mt-3"
                      disabled={ isSaving }
                      max={ SLIDER_CONFIG.max }
                      min={ SLIDER_CONFIG.min }
                      onChange={ (event) => updateSizeField(field, event.target.value) }
                      step={ SLIDER_CONFIG.step }
                      type="range"
                      value={ getSliderSizeValue(formState[field]) }
                    />
                  </div>

                  { field === "sizeZ" ? (
                    <ActionButton
                      aria-label="Reset sizes"
                      className="mt-[22px] h-[46px] min-h-[46px] w-9 rounded-xl border-transparent bg-transparent px-0 py-0 text-white/42 hover:bg-white/[0.04] hover:text-white/70"
                      disabled={ isSaving }
                      icon={ <RotateCcw className="h-3.5 w-3.5" aria-hidden="true"/> }
                      onClick={ resetSizes }
                      variant="ghost"
                    />
                  ) : null }
                </div>
              )) }
            </div>

            <StatusBanner message={ formError } tone="error"/>

            <ActionButton
              disabled={ isSaving }
              icon={ <Save className="h-4 w-4" aria-hidden="true"/> }
              type="submit"
              variant="primary"
            >
              { isSaving ? "Saving..." : "Save Entry" }
            </ActionButton>
          </form>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <MinecraftSkinViewer
              height={ 360 }
              nameTag={ previewNameTag }
              scale={ previewScale }
              skinUrl={ previewSkinUrl }
              width={ 270 }
            />
          </aside>
        </div>
      </section>
    </div>
  )
}

function parseSize(value: string, label: string) {
  const normalizedValue = value.trim().replace(",", ".")
  if (! normalizedValue) return 1
  const parsed = Number(normalizedValue)
  if (! Number.isFinite(parsed)) return `${ label } must be a valid number.`
  return parsed
}

function parsePreviewSize(value: string) {
  const parsed = Number(value.trim().replace(",", "."))
  return Number.isFinite(parsed) ? parsed : 1
}

function getSliderSizeValue(value: string) {
  const parsed = parsePreviewSize(value)
  return Math.min(SLIDER_CONFIG.max, Math.max(SLIDER_CONFIG.min, parsed))
}

const formatSize = (value: number | undefined) => value === undefined ? "1.0" : String(value)

function buildFormState(uuid: string | undefined, entry: DatabaseEntry | undefined): DatabaseFormState {
  return {
    name: entry?.getName() ?? "",
    sizeX: formatSize(entry?.getSizeX()),
    sizeY: formatSize(entry?.getSizeY()),
    sizeZ: formatSize(entry?.getSizeZ()),
    uuid: uuid ?? ""
  }
}