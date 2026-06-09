import { type KeyboardEvent, memo, type MouseEvent } from "react"
import { Crown, Sparkles, Trash2 } from "lucide-react"
import { ActionButton } from "./ActionButton"
import type { DatabaseOwner } from "../types/DatabaseEntry"

interface DatabaseOwnerOnlyRowProps {
  isDeleting?: boolean
  onDelete: (uuid: string) => void
  onEditEntry: (uuid: string) => void
  owner: DatabaseOwner
  uuid: string
}

export const DatabaseOwnerOnlyRow = memo(({ isDeleting, onDelete, onEditEntry, owner, uuid }: DatabaseOwnerOnlyRowProps) => {
  const handleEdit = () => onEditEntry(uuid)

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleEdit()
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onDelete(uuid)
  }

  return (
    <article
      className="rare-owner-card flex h-full min-h-[154px] min-w-0 cursor-pointer flex-col rounded-2xl border p-4 transition focus:outline-none focus:ring-4 focus:ring-cyan-300/10"
      onClick={ handleEdit }
      onKeyDown={ handleKeyDown }
      role="button"
      tabIndex={ 0 }
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-300/10 px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-yellow-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true"/>
            <span>Owner</span>
          </div>
          <p className="break-all font-mono text-xs text-white/50">{ uuid }</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
            <Crown className="h-5 w-5" aria-hidden="true"/>
          </div>
          <ActionButton
            aria-label="Delete owner"
            className="h-8 min-h-8 w-10 rounded-lg px-0 py-0"
            disabled={ isDeleting }
            icon={ <Trash2 className="h-4 w-4" aria-hidden="true"/> }
            onClick={ handleDelete }
            variant="danger"
          />
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-5">
        <p className="text-sm font-semibold text-white/72">
          Owner without entry
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={ `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
            owner.hasName
              ? "border-cyan-300/20 bg-cyan-300/[0.075] text-cyan-100/85"
              : "border-white/10 bg-white/[0.035] text-white/34"
          }` }>
            hasName
          </span>
          <span className={ `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
            owner.hasSize
              ? "border-cyan-300/20 bg-cyan-300/[0.075] text-cyan-100/85"
              : "border-white/10 bg-white/[0.035] text-white/34"
          }` }>
            hasSize
          </span>
        </div>
      </div>
    </article>
  )
})
