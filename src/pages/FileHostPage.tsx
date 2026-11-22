import { type DragEvent, type FormEvent, useEffect, useRef, useState } from "react"
import { Check, Clock, Copy, ExternalLink, Eye, File as FileIcon, KeyRound, Link2, Lock, LogOut, Pencil, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import FileHostApi, { type HostedFile, type UploadedFile, type UploadOptions } from "../lib/FileHostApi.ts"
import { NoammApiError } from "../lib/NoammApi.ts"
import NotificationManager from "../lib/NotificationManager"
import { getErrorMessage } from "../utils"

type UploadStatus = "uploading" | "done" | "error"

type PreviewKind = "image" | "video" | "audio"

interface UploadItem {
  controller: AbortController
  error: string | null
  file: File
  id: number
  preview: { kind: PreviewKind, url: string } | null
  progress: number
  result: UploadedFile | null
  status: UploadStatus
}

const EXPIRY_OPTIONS = [
  { label: "Never", value: null },
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" }
]

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${ bytes } B`
  if (bytes < 1024 * 1024) return `${ (bytes / 1024).toFixed(1) } KB`
  if (bytes < 1024 * 1024 * 1024) return `${ (bytes / 1024 / 1024).toFixed(1) } MB`
  return `${ (bytes / 1024 / 1024 / 1024).toFixed(1) } GB`
}

// Zipline keeps listing expired or used up files until its cleanup job deletes them
const activeLinks = (files: HostedFile[]) => {
  const now = Date.now()
  return files.filter((file) => (! file.deletesAt || Date.parse(file.deletesAt) > now) && (file.maxViews === null || file.views < file.maxViews)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Same split as the file host API, so "archive.tar.gz" keeps ".gz" and ".env" has no extension
const splitExtension = (name: string) => {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? [ name.slice(0, dot), name.slice(dot) ] : [ name, "" ]
}

const PREVIEW_KINDS: PreviewKind[] = [ "image", "video", "audio" ]

const previewOf = (file: File) => {
  const kind = PREVIEW_KINDS.find((previewKind) => file.type.startsWith(`${ previewKind }/`))
  return kind ? { kind, url: URL.createObjectURL(file) } : null
}

const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

const formatExpiry = (date: string) => {
  const minutes = Math.round((Date.parse(date) - Date.now()) / 60000)
  if (minutes < 60) return relativeTime.format(minutes, "minute")
  if (minutes < 60 * 24) return relativeTime.format(Math.round(minutes / 60), "hour")
  return relativeTime.format(Math.round(minutes / 60 / 24), "day")
}

type FileKind = "image" | "video" | "audio" | "archive" | "other"

const KIND_EXTENSIONS: [ FileKind, string[] ][] = [
  [ "image", [ ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp", ".ico" ] ],
  [ "video", [ ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v" ] ],
  [ "audio", [ ".mp3", ".wav", ".ogg", ".flac", ".m4a", ".opus" ] ],
  [ "archive", [ ".zip", ".rar", ".7z", ".tar", ".gz", ".xz", ".jar" ] ]
]

const KIND_STYLES: Record<FileKind, string> = {
  image: "bg-[#70a7ff]/12 text-[#9cc2ff]",
  video: "bg-violet-400/12 text-violet-300",
  audio: "bg-emerald-400/12 text-emerald-300",
  archive: "bg-amber-400/12 text-amber-300",
  other: "bg-white/[0.06] text-white/55"
}

const fileKind = (extension: string) => KIND_EXTENSIONS.find(([ , extensions ]) => extensions.includes(extension.toLowerCase()))?.[0] ?? "other"

const TOOLBAR_INPUT_CLASSES = "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#70a7ff]/50 focus:ring-4 focus:ring-[#70a7ff]/15"

function FileTile({ name, password = false, thumbnail = null }: { name: string, password?: boolean, thumbnail?: string | null }) {
  const extension = splitExtension(name)[1]

  return (
    <div className={ `relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-bold tracking-wide ${ KIND_STYLES[fileKind(extension)] }` }>
      { thumbnail
        ? <img alt="" className="h-full w-full rounded-xl object-cover" src={ thumbnail }/>
        : extension.slice(1, 5).toUpperCase() || <FileIcon className="h-4 w-4" aria-hidden="true"/> }
      { password ? (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[#1a1a22] text-white/70 ring-2 ring-[#0a0a0a]">
          <Lock className="h-2.5 w-2.5" aria-label="Password protected"/>
        </span>
      ) : null }
    </div>
  )
}

export function FileHostPage() {
  const [ isAuthed, setIsAuthed ] = useState<boolean | null>(null)
  const [ adminPassword, setAdminPassword ] = useState("")
  const [ isLoggingIn, setIsLoggingIn ] = useState(false)
  const [ loginError, setLoginError ] = useState<string | null>(null)
  const [ items, setItems ] = useState<UploadItem[]>([])
  const [ isDragging, setIsDragging ] = useState(false)
  const [ expiresIn, setExpiresIn ] = useState<string | null>("7d")
  const [ maxViews, setMaxViews ] = useState("")
  const [ password, setPassword ] = useState("")
  const [ links, setLinks ] = useState<HostedFile[] | null>(null)
  const [ linksError, setLinksError ] = useState<string | null>(null)
  const [ isLoadingLinks, setIsLoadingLinks ] = useState(false)
  const [ armedDeleteId, setArmedDeleteId ] = useState<string | null>(null)
  const [ deletingIds, setDeletingIds ] = useState<string[]>([])
  const [ renamingId, setRenamingId ] = useState<string | null>(null)
  const [ newName, setNewName ] = useState("")
  const [ isRenaming, setIsRenaming ] = useState(false)
  const nextIdRef = useRef(0)
  const disarmTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    FileHostApi.isLoggedIn().then(setIsAuthed).catch(() => setIsAuthed(false))
  }, [])

  useEffect(() => {
    if (! isAuthed) return
    fetchLinks()
  }, [ isAuthed ])

  function fetchLinks() {
    FileHostApi.listFiles().then((files) => {
      setLinks(activeLinks(files))
      setLinksError(null)
    }).catch((error) => {
      if (error instanceof NoammApiError && error.status === 401) setIsAuthed(false)
      setLinksError(getErrorMessage(error))
    }).finally(() => setIsLoadingLinks(false))
  }

  const refreshLinks = () => {
    setIsLoadingLinks(true)
    fetchLinks()
  }

  // First click arms the button, a second one within 3 seconds deletes
  const handleDelete = (file: HostedFile) => {
    window.clearTimeout(disarmTimeoutRef.current)
    if (armedDeleteId !== file.id) {
      setArmedDeleteId(file.id)
      disarmTimeoutRef.current = window.setTimeout(() => setArmedDeleteId(null), 3000)
      return
    }

    setArmedDeleteId(null)
    setDeletingIds((ids) => [ ...ids, file.id ])
    FileHostApi.deleteFile(file.id).then(() => {
      setLinks((currentLinks) => currentLinks?.filter((link) => link.id !== file.id) ?? null)
      NotificationManager.notify({ message: `Deleted ${ file.name }.`, tone: "success" })
    }).catch((error) => {
      if (error instanceof NoammApiError && error.status === 401) setIsAuthed(false)
      NotificationManager.notify({ message: getErrorMessage(error), tone: "error" })
    }).finally(() => setDeletingIds((ids) => ids.filter((id) => id !== file.id)))
  }

  const startRename = (file: HostedFile) => {
    setRenamingId(file.id)
    setNewName(splitExtension(file.name)[0])
  }

  const cancelRename = () => {
    setRenamingId(null)
    setNewName("")
  }

  const handleRename = (event: FormEvent<HTMLFormElement>, file: HostedFile) => {
    event.preventDefault()

    const stem = newName.trim()
    const name = `${ stem }${ splitExtension(file.name)[1] }`
    if (! stem || name === file.name) return cancelRename()

    setIsRenaming(true)
    FileHostApi.renameFile(file.id, name).then(() => {
      cancelRename()
      fetchLinks()
      NotificationManager.notify({ message: `Renamed to ${ name }.`, tone: "success" })
    }).catch((error) => {
      if (error instanceof NoammApiError && error.status === 401) setIsAuthed(false)
      NotificationManager.notify({ message: getErrorMessage(error), tone: "error" })
    }).finally(() => setIsRenaming(false))
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextPassword = adminPassword.trim()
    if (! nextPassword) return setLoginError("The admin password is required.")

    setIsLoggingIn(true)
    setLoginError(null)

    try {
      await FileHostApi.login(nextPassword)
      setAdminPassword("")
      setIsAuthed(true)
    }
    catch (error) {
      setLoginError(getErrorMessage(error))
    }
    finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    items.forEach((item) => {
      item.controller.abort()
      if (item.preview) URL.revokeObjectURL(item.preview.url)
    })
    setItems([])
    setLinks(null)
    setIsAuthed(false)
    void FileHostApi.logout().catch(() => {
    })
  }

  const updateItem = (id: number, changes: Partial<UploadItem>) => {
    setItems((currentItems) => currentItems.map((item) => item.id === id ? { ...item, ...changes } : item))
  }

  const startUpload = (file: File, options: UploadOptions) => {
    nextIdRef.current += 1
    const id = nextIdRef.current
    const controller = new AbortController()
    const tooLarge = file.size > FileHostApi.MAX_FILE_SIZE

    setItems((currentItems) => [ {
      controller,
      error: tooLarge ? `Files can be at most ${ formatSize(FileHostApi.MAX_FILE_SIZE) }.` : null,
      file,
      id,
      preview: tooLarge ? null : previewOf(file),
      progress: 0,
      result: null,
      status: tooLarge ? "error" : "uploading"
    }, ...currentItems ])

    if (tooLarge) return

    FileHostApi.upload(file, options, (progress) => updateItem(id, { progress }), controller.signal).then((result) => {
      updateItem(id, { progress: 1, result, status: "done" })
      fetchLinks()

      // Warming counts as a view, a password-protected link needs the password, and a pending
      // chunked upload isn't on Zipline yet, so Cloudflare would cache its 404 instead
      if (result.pending || options.maxViews || options.password || file.size > FileHostApi.MAX_CACHED_SIZE) return
      void FileHostApi.warmCache(result.raw, controller.signal).catch(() => {
      })
    }).catch((error) => {
      if (controller.signal.aborted) return
      if (error instanceof NoammApiError && error.status === 401) setIsAuthed(false)
      updateItem(id, { error: getErrorMessage(error), status: "error" })
    })
  }

  const addFiles = (files: FileList | null) => {
    if (! files?.length) return
    const options = { expiresIn, maxViews, password }
    for (const file of Array.from(files)) startUpload(file, options)
  }

  const removeItem = (item: UploadItem) => {
    item.controller.abort()
    if (item.preview) URL.revokeObjectURL(item.preview.url)
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => NotificationManager.notify({ message: "Link copied.", tone: "success" })).catch(() => NotificationManager.notify({ message: "Couldn't copy the link.", tone: "error" }))
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  // dragleave also fires when the pointer moves onto a child, so only stop once it leaves the drop area itself
  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  if (isAuthed === null) return null

  if (! isAuthed) return (
    <main className="relative grid place-items-center px-5 py-8">
      <form className="flex w-full max-w-[340px] flex-col gap-5 text-left" onSubmit={ handleLogin }>
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#70a7ff]/12 text-[#9cc2ff]">
            <Upload className="h-5 w-5" aria-hidden="true"/>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-white">File Host</h1>
            <p className="text-sm text-white/45">Log in with the admin password.</p>
          </div>
        </div>

        <TextField
          autoComplete="current-password"
          icon={ <KeyRound className="h-3.5 w-3.5" aria-hidden="true"/> }
          label="Admin Password"
          onChange={ (event) => setAdminPassword(event.target.value) }
          placeholder="Enter Password"
          type="password"
          value={ adminPassword }
        />

        <StatusBanner message={ loginError } tone="error"/>

        <ActionButton
          disabled={ isLoggingIn }
          icon={ <KeyRound className="h-4 w-4" aria-hidden="true"/> }
          type="submit"
          variant="primary"
        >
          { isLoggingIn ? "Logging in..." : "Log in" }
        </ActionButton>
      </form>
    </main>
  )

  return (
    <main className="relative flex flex-col border-t border-white/[0.06] lg:grid lg:h-[calc(100vh-4.75rem)] lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
      <section
        className="relative flex min-h-0 flex-col lg:col-start-2 lg:row-start-1 lg:overflow-y-auto"
        onDragLeave={ handleDragLeave }
        onDragOver={ handleDragOver }
        onDrop={ handleDrop }
      >
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Upload className="h-4 w-4 text-[#9cc2ff]" aria-hidden="true"/>
            <h1 className="text-sm font-semibold text-white">File Host</h1>
          </div>
          <ActionButton
            className="h-8 min-h-8 rounded-lg px-2.5 py-0 text-xs"
            icon={ <LogOut className="h-3.5 w-3.5" aria-hidden="true"/> }
            onClick={ handleLogout }
            variant="ghost"
          >
            Log out
          </ActionButton>
        </header>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/[0.06] px-5 py-3 text-sm sm:px-8">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-white/40" aria-hidden="true"/>
            <span className="text-white/50">Expires</span>
            <div className="flex rounded-lg bg-white/[0.04] p-0.5" role="group" aria-label="Expires">
              { EXPIRY_OPTIONS.map((option) => (
                <button
                  aria-pressed={ expiresIn === option.value }
                  className={ `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    expiresIn === option.value ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
                  }` }
                  key={ option.label }
                  onClick={ () => setExpiresIn(option.value) }
                  type="button"
                >
                  { option.label }
                </button>
              )) }
            </div>
          </div>

          <label className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-white/40" aria-hidden="true"/>
            <span className="text-white/50">Max views</span>
            <input
              autoComplete="off"
              className={ `${ TOOLBAR_INPUT_CLASSES } w-24` }
              inputMode="numeric"
              onChange={ (event) => setMaxViews(event.target.value.replace(/\D/g, "")) }
              placeholder="Unlimited"
              value={ maxViews }
            />
          </label>

          <label className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-white/40" aria-hidden="true"/>
            <span className="text-white/50">Password</span>
            <input
              autoComplete="new-password"
              className={ `${ TOOLBAR_INPUT_CLASSES } w-32` }
              onChange={ (event) => setPassword(event.target.value) }
              placeholder="None"
              type="password"
              value={ password }
            />
          </label>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8 sm:px-8">
          <label
            className={ `group flex min-h-[38vh] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors duration-200 has-[:focus-visible]:border-[#70a7ff]/60 ${
              isDragging ? "border-[#70a7ff]/70 bg-[#70a7ff]/[0.07]" : "border-white/10 hover:border-white/20"
            }` }
          >
            <div className={ `grid h-16 w-16 place-items-center rounded-2xl transition-transform duration-200 ${ isDragging ? "scale-110 bg-[#70a7ff]/20 text-[#cfe0ff]" : "bg-white/[0.05] text-white/60 group-hover:text-white/80" }` }>
              <Upload className="h-7 w-7" aria-hidden="true"/>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                { isDragging ? "Release to upload" : "Drop files to upload" }
              </p>
              <p className="mt-2 text-sm text-white/45">
                or <span className="font-medium text-[#9cc2ff] underline decoration-[#9cc2ff]/40 underline-offset-4">browse your computer</span>, up to { formatSize(FileHostApi.MAX_FILE_SIZE) } each
              </p>
            </div>
            <input
              className="sr-only"
              multiple
              onChange={ (event) => {
                addFiles(event.target.files)
                event.target.value = ""
              } }
              type="file"
            />
          </label>

          { items.length > 0 ? (
            <ul className="flex flex-col divide-y divide-white/[0.06]">
              { items.map((item) => {
                const { result } = item
                const [ stem, extension ] = splitExtension(item.file.name)

                return (
                  <li className="animate-panel-in py-3" key={ item.id }>
                    <div className="flex items-center gap-3">
                      <FileTile name={ item.file.name } thumbnail={ item.preview?.kind === "image" ? item.preview.url : null }/>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white" title={ item.file.name }>
                          { stem }<span className="text-white/35">{ extension }</span>
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-white/40">
                          { item.status === "uploading" ? `${ Math.round(item.progress * 100) }% of ${ formatSize(item.file.size) }` : formatSize(item.file.size) }
                          { item.status === "done" ? <span className="ml-3 text-emerald-300/80">Uploaded</span> : null }
                        </p>
                      </div>
                      { result ? (
                        <>
                          <ActionButton
                            className="h-8 min-h-8 rounded-lg px-2.5 py-0 text-xs"
                            icon={ <Copy className="h-3.5 w-3.5" aria-hidden="true"/> }
                            onClick={ () => copyLink(result.url) }
                            variant="secondary"
                          >
                            Copy link
                          </ActionButton>
                          <a
                            aria-label="Open file"
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                            href={ result.url }
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true"/>
                          </a>
                        </>
                      ) : null }
                      <ActionButton
                        aria-label={ item.status === "uploading" ? "Cancel upload" : "Remove" }
                        className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
                        icon={ <X className="h-3.5 w-3.5" aria-hidden="true"/> }
                        onClick={ () => removeItem(item) }
                        variant="ghost"
                      />
                    </div>

                    { item.status === "uploading" ? (
                      <div className="ml-[3.25rem] mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] to-[#22d3ee] transition-[width] duration-200"
                          style={ { width: `${ Math.round(item.progress * 100) }%` } }
                        />
                      </div>
                    ) : null }

                    { item.preview && item.preview.kind !== "audio" ? (
                      <div className="ml-[3.25rem] mt-3 flex justify-start">
                        { item.preview.kind === "image" ? (
                          <img alt={ item.file.name } className="max-h-72 rounded-xl object-contain" src={ item.preview.url }/>
                        ) : (
                          <video className="max-h-72 w-full rounded-xl bg-black" controls src={ item.preview.url }/>
                        ) }
                      </div>
                    ) : null }

                    { item.preview?.kind === "audio" ? (
                      <audio className="ml-[3.25rem] mt-3 w-[calc(100%-3.25rem)]" controls src={ item.preview.url }/>
                    ) : null }

                    { result ? (
                      <button
                        className="ml-[3.25rem] mt-2 block max-w-[calc(100%-3.25rem)] truncate text-left text-xs text-white/40 transition hover:text-[#9cc2ff]"
                        onClick={ () => copyLink(result.url) }
                        type="button"
                      >
                        { result.url }
                      </button>
                    ) : null }

                    { item.error ? (
                      <p className="ml-[3.25rem] mt-2 text-xs text-red-300" role="alert">{ item.error }</p>
                    ) : null }
                  </li>
                )
              }) }
            </ul>
          ) : null }
        </div>
      </section>

      <aside className="flex min-h-0 flex-col border-t border-white/[0.06] bg-black/25 text-left lg:col-start-1 lg:row-start-1 lg:border-r lg:border-t-0">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-baseline gap-2 text-sm font-semibold text-white">
            Active links
            { links ? <span className="text-xs font-medium tabular-nums text-white/35">{ links.length }</span> : null }
          </h2>
          <ActionButton
            aria-label="Refresh links"
            className="-my-1 h-8 min-h-8 w-8 rounded-lg px-0 py-0"
            disabled={ isLoadingLinks }
            icon={ <RefreshCw className={ `h-3.5 w-3.5 ${ isLoadingLinks ? "animate-spin" : "" }` } aria-hidden="true"/> }
            onClick={ refreshLinks }
            variant="ghost"
          />
        </div>

        { linksError ? (
          <div className="px-3 pt-3">
            <StatusBanner message={ linksError } tone="error"/>
          </div>
        ) : null }

        { links?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Link2 className="h-5 w-5 text-white/25" aria-hidden="true"/>
            <p className="text-sm text-white/45">Files you upload show up here.</p>
          </div>
        ) : null }

        { links?.length ? (
          <ul className="flex min-h-0 flex-col overflow-y-auto p-2">
            { links.map((link) => {
              const isArmed = armedDeleteId === link.id
              const [ stem, extension ] = splitExtension(link.name)

              if (renamingId === link.id) return (
                <li className="rounded-xl bg-white/[0.05] px-2 py-2" key={ link.id }>
                  <form className="flex items-center gap-3" onSubmit={ (event) => handleRename(event, link) }>
                    <FileTile name={ link.name } password={ link.password }/>
                    <div className="flex min-w-0 flex-1 items-center rounded-lg border border-white/10 bg-black/20 pr-2 transition focus-within:border-[#70a7ff]/50 focus-within:ring-4 focus-within:ring-[#70a7ff]/15">
                      <input
                        aria-label="New name"
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-white outline-none disabled:opacity-60"
                        disabled={ isRenaming }
                        onChange={ (event) => setNewName(event.target.value) }
                        onKeyDown={ (event) => {
                          if (event.key === "Escape") cancelRename()
                        } }
                        value={ newName }
                      />
                      { extension ? <span className="shrink-0 text-sm text-white/35">{ extension }</span> : null }
                    </div>
                    <ActionButton
                      aria-label="Save name"
                      className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
                      disabled={ isRenaming }
                      icon={ <Check className="h-3.5 w-3.5" aria-hidden="true"/> }
                      type="submit"
                      variant="ghost"
                    />
                    <ActionButton
                      aria-label="Cancel rename"
                      className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
                      disabled={ isRenaming }
                      icon={ <X className="h-3.5 w-3.5" aria-hidden="true"/> }
                      onClick={ cancelRename }
                      variant="ghost"
                    />
                  </form>
                </li>
              )

              return (
                <li className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors focus-within:bg-white/[0.04] hover:bg-white/[0.04]" key={ link.id }>
                  <FileTile name={ link.name } password={ link.password }/>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white" title={ link.name }>
                      { stem }<span className="text-white/35">{ extension }</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-3 text-xs tabular-nums text-white/40">
                      <span className="shrink-0">{ formatSize(link.size) }</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Eye className="h-3 w-3" aria-hidden="true"/>
                        { link.views }{ link.maxViews === null ? "" : `/${ link.maxViews }` }
                      </span>
                      { link.deletesAt ? (
                        <span className="flex min-w-0 items-center gap-1" title={ `Expires ${ formatDate(link.deletesAt) }` }>
                          <Clock className="h-3 w-3 shrink-0" aria-hidden="true"/>
                          <span className="truncate">{ formatExpiry(link.deletesAt) }</span>
                        </span>
                      ) : null }
                    </p>
                    { link.maxViews !== null ? (
                      <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#70a7ff]/70" style={ { width: `${ Math.min(100, link.views / link.maxViews * 100) }%` } }/>
                      </div>
                    ) : null }
                  </div>
                  <div className={ `flex shrink-0 items-center transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 ${ isArmed ? "" : "[@media(hover:hover)]:opacity-0" }` }>
                    <ActionButton
                      aria-label="Copy link"
                      className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
                      icon={ <Copy className="h-3.5 w-3.5" aria-hidden="true"/> }
                      onClick={ () => copyLink(link.url) }
                      variant="ghost"
                    />
                    <a
                      aria-label="Open file"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                      href={ link.url }
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true"/>
                    </a>
                    <ActionButton
                      aria-label="Rename"
                      className="h-8 min-h-8 w-8 rounded-lg px-0 py-0"
                      icon={ <Pencil className="h-3.5 w-3.5" aria-hidden="true"/> }
                      onClick={ () => startRename(link) }
                      variant="ghost"
                    />
                    <ActionButton
                      aria-label={ isArmed ? "Click again to delete" : "Delete" }
                      className={ `h-8 min-h-8 rounded-lg py-0 ${ isArmed ? "bg-red-400/10 px-2.5 text-red-300" : "w-8 px-0 hover:text-red-300" }` }
                      disabled={ deletingIds.includes(link.id) }
                      icon={ <Trash2 className="h-3.5 w-3.5" aria-hidden="true"/> }
                      onClick={ () => handleDelete(link) }
                      variant="ghost"
                    >
                      { isArmed ? "Delete?" : null }
                    </ActionButton>
                  </div>
                </li>
              )
            }) }
          </ul>
        ) : null }
      </aside>
    </main>
  )
}
