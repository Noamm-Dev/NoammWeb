import { Trash2 } from "lucide-react"
import { type KeyboardEvent, memo, type MouseEvent, useMemo } from "react"
import { ActionButton } from "./ActionButton"
import { MinecraftTextPreview } from "./MinecraftTextPreview"
import DatabaseEntry from "../types/DatabaseEntry"

interface DatabaseEntryRowProps {
  actionsEnabled?: boolean
  entry: DatabaseEntry
  uuid: string
  onDelete?: (uuid: string) => void
  onEdit?: (uuid: string, entry: DatabaseEntry) => void
  isDeleting?: boolean
}

interface SizeTag {
  axis: "X" | "Y" | "Z"
  value: number
}

function buildSizeTags(entry: DatabaseEntry): SizeTag[] {
  const tags: SizeTag[] = []

  if (entry.getSizeX() !== 1) tags.push({ axis: "X", value: entry.getSizeX() })
  if (entry.getSizeY() !== 1) tags.push({ axis: "Y", value: entry.getSizeY() })
  if (entry.getSizeZ() !== 1) tags.push({ axis: "Z", value: entry.getSizeZ() })

  return tags
}

export const DatabaseEntryRow = memo(({ actionsEnabled = true, entry, isDeleting, onDelete, onEdit, uuid }: DatabaseEntryRowProps) => {
  const sizeTags = useMemo(() => buildSizeTags(entry), [ entry ])
  const canEdit = actionsEnabled && Boolean(onEdit)
  const canDelete = actionsEnabled && Boolean(onDelete)

  const handleEdit = () => onEdit?.(uuid, entry)

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (! canEdit) return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleEdit()
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onDelete?.(uuid)
  }

  return (
    <article
      className={ `flex h-full min-h-[154px] min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition ${
        canEdit
          ? "cursor-pointer hover:border-cyan-300/35 hover:bg-white/[0.055] hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] focus:outline-none focus:ring-4 focus:ring-cyan-300/10"
          : ""
      }` }
      onClick={ canEdit ? handleEdit : undefined }
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

        { canDelete ? (
          <ActionButton
            aria-label="Delete entry"
            className="h-8 min-h-8 w-10 shrink-0 rounded-lg px-0 py-0"
            disabled={ isDeleting }
            icon={ <Trash2 className="h-4 w-4" aria-hidden="true"/> }
            onClick={ handleDelete }
            variant="danger"
          />
        ) : null }
      </div>
    </article>
  )
})