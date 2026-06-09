import { Save, Settings, ShieldCheck, Trash2, X } from "lucide-react"
import { type CSSProperties, type FormEvent, type KeyboardEvent, memo, type MouseEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ActionButton } from "./ActionButton"
import { MinecraftTextPreview } from "./MinecraftTextPreview"
import { StatusBanner } from "./StatusBanner"
import DatabaseEntry, { type DatabaseOwner } from "../types/DatabaseEntry"

interface DatabaseEntryRowProps {
  actionsEnabled?: boolean
  entry: DatabaseEntry
  isDeletingEntry?: boolean
  isSavingOwner?: boolean
  owner?: DatabaseOwner
  uuid: string
  onDeleteEntry?: (uuid: string) => Promise<string | null>
  onEdit?: (uuid: string, entry: DatabaseEntry) => void
  onSaveOwner?: (uuid: string, owner: DatabaseOwner) => Promise<string | null>
}

interface SizeTag {
  axis: "X" | "Y" | "Z"
  value: number
}

interface SettingsMenuPosition {
  left: number
  maxHeight: number
  top: number
  width: number
}

function buildSizeTags(entry: DatabaseEntry): SizeTag[] {
  const tags: SizeTag[] = []

  if (entry.getSizeX() !== 1) tags.push({ axis: "X", value: entry.getSizeX() })
  if (entry.getSizeY() !== 1) tags.push({ axis: "Y", value: entry.getSizeY() })
  if (entry.getSizeZ() !== 1) tags.push({ axis: "Z", value: entry.getSizeZ() })

  return tags
}

const DEFAULT_OWNER: DatabaseOwner = { hasName: false, hasSize: false }

const DELETE_CONFIRM_LABELS = [
  "Are you sure?",
  "Are you reallyyyy sure?",
  "Are you really really sure?"
] as const

const SETTINGS_MENU_EDGE_GAP = 16
const SETTINGS_MENU_GAP = 8
const SETTINGS_MENU_MAX_WIDTH = 320

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, input, select, textarea"))
}

export const DatabaseEntryRow = memo(({
  actionsEnabled = true,
  entry,
  isDeletingEntry = false,
  isSavingOwner = false,
  onDeleteEntry,
  onEdit,
  onSaveOwner,
  owner = DEFAULT_OWNER,
  uuid
}: DatabaseEntryRowProps) => {
  const sizeTags = useMemo(() => buildSizeTags(entry), [ entry ])
  const canEdit = actionsEnabled && Boolean(onEdit)
  const canConfigureOwner = actionsEnabled && Boolean(onDeleteEntry && onSaveOwner)
  const isBusy = isDeletingEntry || isSavingOwner
  const settingsMenuRef = useRef<HTMLDivElement | null>(null)
  const settingsPanelRef = useRef<HTMLDivElement | null>(null)
  const ignoreNextCardClickRef = useRef(false)
  const [ isSettingsMenuOpen, setIsSettingsMenuOpen ] = useState(false)
  const [ isDeleteConfirming, setIsDeleteConfirming ] = useState(false)
  const [ deleteConfirmStep, setDeleteConfirmStep ] = useState(0)
  const [ hasName, setHasName ] = useState(owner.hasName)
  const [ hasSize, setHasSize ] = useState(owner.hasSize)
  const [ formError, setFormError ] = useState<string | null>(null)
  const [ settingsMenuPosition, setSettingsMenuPosition ] = useState<SettingsMenuPosition | null>(null)

  const handleEdit = () => onEdit?.(uuid, entry)

  const closeSettingsMenu = useCallback(() => {
    if (isBusy) return
    setIsSettingsMenuOpen(false)
    setIsDeleteConfirming(false)
    setDeleteConfirmStep(0)
    setFormError(null)
    setSettingsMenuPosition(null)
  }, [ isBusy ])

  const updateSettingsMenuPosition = useCallback(() => {
    const anchor = settingsMenuRef.current
    if (! anchor) return

    const anchorRect = anchor.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxHeight = viewportHeight - SETTINGS_MENU_EDGE_GAP * 2
    const width = Math.min(SETTINGS_MENU_MAX_WIDTH, viewportWidth - SETTINGS_MENU_EDGE_GAP * 2)
    const rightSideLeft = anchorRect.right + SETTINGS_MENU_GAP
    const leftSideLeft = anchorRect.left - width - SETTINGS_MENU_GAP
    const hasRoomOnRight = rightSideLeft + width <= viewportWidth - SETTINGS_MENU_EDGE_GAP
    const hasRoomOnLeft = leftSideLeft >= SETTINGS_MENU_EDGE_GAP
    const left = hasRoomOnRight
      ? rightSideLeft
      : hasRoomOnLeft
        ? leftSideLeft
        : Math.min(
          Math.max(SETTINGS_MENU_EDGE_GAP, anchorRect.right - width),
          viewportWidth - width - SETTINGS_MENU_EDGE_GAP
        )
    const measuredHeight = Math.min(settingsPanelRef.current?.offsetHeight ?? 280, maxHeight)
    const anchorCenterY = anchorRect.top + anchorRect.height / 2
    const top = Math.min(
      Math.max(SETTINGS_MENU_EDGE_GAP, anchorCenterY - measuredHeight / 2),
      viewportHeight - measuredHeight - SETTINGS_MENU_EDGE_GAP
    )

    setSettingsMenuPosition({ left, maxHeight, top, width })
  }, [])

  useEffect(() => {
    if (isSettingsMenuOpen) return
    setHasName(owner.hasName)
    setHasSize(owner.hasSize)
  }, [ isSettingsMenuOpen, owner.hasName, owner.hasSize ])

  useEffect(() => {
    if (! isSettingsMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        ! isBusy &&
        target instanceof Node &&
        settingsMenuRef.current &&
        ! settingsMenuRef.current.contains(target) &&
        ! settingsPanelRef.current?.contains(target)
      ) {
        ignoreNextCardClickRef.current = true
        window.setTimeout(() => {
          ignoreNextCardClickRef.current = false
        }, 0)
        closeSettingsMenu()
      }
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeSettingsMenu()
    }

    updateSettingsMenuPosition()
    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleWindowKeyDown)
    window.addEventListener("resize", updateSettingsMenuPosition)
    window.addEventListener("scroll", updateSettingsMenuPosition, true)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleWindowKeyDown)
      window.removeEventListener("resize", updateSettingsMenuPosition)
      window.removeEventListener("scroll", updateSettingsMenuPosition, true)
    }
  }, [ closeSettingsMenu, isBusy, isSettingsMenuOpen, updateSettingsMenuPosition ])

  useLayoutEffect(() => {
    if (isSettingsMenuOpen) updateSettingsMenuPosition()
  }, [ deleteConfirmStep, formError, isDeleteConfirming, isSettingsMenuOpen, updateSettingsMenuPosition ])

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (! canEdit) return
    if (isInteractiveTarget(event.target)) return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleEdit()
  }

  function handleArticleClick() {
    if (ignoreNextCardClickRef.current) {
      ignoreNextCardClickRef.current = false
      return
    }

    handleEdit()
  }

  function handleConfigureOwner(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (! canConfigureOwner || isBusy) return

    setHasName(owner.hasName)
    setHasSize(owner.hasSize)
    setFormError(null)
    setIsDeleteConfirming(false)
    setDeleteConfirmStep(0)
    setIsSettingsMenuOpen((currentValue) => ! currentValue)
  }

  async function handleSaveOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (! onSaveOwner) return

    setFormError(null)
    const apiError = await onSaveOwner(uuid, { hasName, hasSize })
    if (apiError) {
      setFormError(apiError)
      return
    }

    closeSettingsMenu()
  }

  function handleDeleteClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setFormError(null)
    setIsDeleteConfirming(true)
    setDeleteConfirmStep(0)
  }

  async function handleConfirmDeleteEntry(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (! onDeleteEntry) return

    if (deleteConfirmStep < DELETE_CONFIRM_LABELS.length - 1) {
      setDeleteConfirmStep((currentStep) => currentStep + 1)
      return
    }

    setFormError(null)
    const apiError = await onDeleteEntry(uuid)
    if (apiError) {
      setFormError(apiError)
      return
    }

    closeSettingsMenu()
  }

  function handleCancelDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setIsDeleteConfirming(false)
    setDeleteConfirmStep(0)
  }

  const settingsMenuStyle = settingsMenuPosition ? {
    left: settingsMenuPosition.left,
    maxHeight: settingsMenuPosition.maxHeight,
    top: settingsMenuPosition.top,
    width: settingsMenuPosition.width
  } satisfies CSSProperties : undefined

  const settingsMenu = isSettingsMenuOpen && typeof document !== "undefined" ? createPortal((
    <div
      aria-label="Entry settings"
      className="fixed z-[70] overflow-y-auto rounded-xl border border-white/10 bg-[#1f1f2c] p-3 text-left shadow-2xl shadow-black/40"
      onClick={ (event) => event.stopPropagation() }
      ref={ settingsPanelRef }
      role="dialog"
      style={ settingsMenuStyle }
    >
      { isDeleteConfirming ? (
        <div className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white">
                Delete entry
              </p>
              <p className="mt-1 text-xs font-semibold text-white/42">
                Owner settings will stay untouched.
              </p>
            </div>
            <ActionButton
              aria-label="Close delete confirmation"
              className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
              disabled={ isDeletingEntry }
              icon={ <X className="h-4 w-4" aria-hidden="true"/> }
              onClick={ handleCancelDelete }
              variant="ghost"
            />
          </div>

          <p className="break-all rounded-lg border border-white/10 bg-black/15 p-3 font-mono text-[11px] text-white/45">
            { uuid }
          </p>

          <StatusBanner message={ formError } tone="error"/>

          <div className="grid gap-2">
            <ActionButton
              className="w-full"
              disabled={ isDeletingEntry }
              onClick={ handleCancelDelete }
            >
              Cancel
            </ActionButton>
            <ActionButton
              className="w-full"
              disabled={ isDeletingEntry }
              icon={ <Trash2 className="h-4 w-4" aria-hidden="true"/> }
              onClick={ handleConfirmDeleteEntry }
              variant="danger"
            >
              { isDeletingEntry ? "Deleting..." : DELETE_CONFIRM_LABELS[deleteConfirmStep] }
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                <Settings className="h-3.5 w-3.5" aria-hidden="true"/>
                <span>Owner settings</span>
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-white/35">
                { uuid }
              </p>
            </div>
            <ActionButton
              aria-label="Close settings"
              className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
              disabled={ isBusy }
              icon={ <X className="h-4 w-4" aria-hidden="true"/> }
              onClick={ closeSettingsMenu }
              variant="ghost"
            />
          </div>

          <form className="grid gap-3" onSubmit={ handleSaveOwner }>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.06]">
              <input
                checked={ hasName }
                className="h-4 w-4 accent-cyan-300"
                disabled={ isBusy }
                onChange={ (event) => setHasName(event.target.checked) }
                type="checkbox"
              />
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true"/>
                <span>hasName</span>
              </span>
            </label>

            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.06]">
              <input
                checked={ hasSize }
                className="h-4 w-4 accent-cyan-300"
                disabled={ isBusy }
                onChange={ (event) => setHasSize(event.target.checked) }
                type="checkbox"
              />
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true"/>
                <span>hasSize</span>
              </span>
            </label>

            <StatusBanner message={ formError } tone="error"/>

            <ActionButton
              className="w-full"
              disabled={ isBusy }
              icon={ <Save className="h-4 w-4" aria-hidden="true"/> }
              type="submit"
              variant="primary"
            >
              { isSavingOwner ? "Saving..." : "Save owner" }
            </ActionButton>
          </form>

          <ActionButton
            className="w-full"
            disabled={ isBusy }
            icon={ <Trash2 className="h-4 w-4" aria-hidden="true"/> }
            onClick={ handleDeleteClick }
            variant="danger"
          >
            Delete Entry
          </ActionButton>
        </div>
      ) }
    </div>
  ), document.body) : null

  return (
    <article
      className={ `flex h-full min-h-[154px] min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition ${
        canEdit
          ? "cursor-pointer hover:border-cyan-300/35 hover:bg-white/[0.055] hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] focus:outline-none focus:ring-4 focus:ring-cyan-300/10"
          : ""
      }` }
      onClick={ canEdit ? handleArticleClick : undefined }
      onKeyDown={ handleKeyDown }
      role={ canEdit ? "button" : undefined }
      tabIndex={ canEdit ? 0 : undefined }
    >
      <div className="min-w-0">
        <p className="break-all font-mono text-xs text-white/45">{ uuid }</p>
      </div>

      <div className="mt-4">
        <MinecraftTextPreview
          className="minecraft-preview-centered"
          emptyLabel="No custom name"
          value={ entry.getName() ?? "" }
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          { sizeTags.length > 0 ? (
            sizeTags.map((tag) => (
              <span
                className="inline-flex items-center overflow-hidden rounded-full border border-cyan-300/20 bg-cyan-300/[0.075] text-xs font-semibold text-white/78"
                key={ tag.axis }
              >
                <span className="border-r border-cyan-200/15 bg-white/[0.045] px-2 py-1 font-bold text-cyan-100/80">
                  { tag.axis }
                </span>
                <span className="px-2 py-1 font-mono text-[11px] text-white/72">
                  { tag.value }
                </span>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-semibold text-white/38">
              <span className="h-1.5 w-1.5 rounded-full bg-white/20"/>
              <span>Default scale</span>
            </span>
          ) }
        </div>

        { canConfigureOwner ? (
          <div className="relative shrink-0" ref={ settingsMenuRef }>
            <ActionButton
              aria-expanded={ isSettingsMenuOpen }
              aria-haspopup="dialog"
              aria-label="Edit owner settings"
              className="h-8 min-h-8 w-10 rounded-lg px-0 py-0"
              disabled={ isBusy }
              icon={ <Settings className="h-4 w-4" aria-hidden="true"/> }
              onClick={ handleConfigureOwner }
            />

            { settingsMenu }
          </div>
        ) : null }
      </div>
    </article>
  )
})
