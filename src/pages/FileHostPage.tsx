import { type DragEvent, type FormEvent, useEffect, useRef, useState } from "react"
import { Clock, Copy, ExternalLink, Eye, File as FileIcon, KeyRound, Link2, Lock, LogOut, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { ActionButton } from "../components/ActionButton"
import { StatusBanner } from "../components/StatusBanner"
import { TextField } from "../components/TextField"
import FileHostApi, { type HostedFile, type UploadedFile, type UploadOptions } from "../lib/FileHostApi.ts"
import { NoammApiError } from "../lib/NoammApi.ts"
import NotificationManager from "../lib/NotificationManager"
import { getErrorMessage } from "../utils"

type UploadStatus = "uploading" | "done" | "error"

interface UploadItem {
  controller: AbortController
  error: string | null
  file: File
  id: number
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
  return `${ (bytes / 1024 / 1024).toFixed(1) } MB`
}

// Zipline keeps listing expired or used up files until its cleanup job deletes them
const activeLinks = (files: HostedFile[]) => {
  const now = Date.now()
  return files
    .filter((file) => (! file.deletesAt || Date.parse(file.deletesAt) > now) && (file.maxViews === null || file.views < file.maxViews))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

export function FileHostPage() {
  const [ isAuthed, setIsAuthed ] = useState<boolean | null>(null)
  const [ adminPassword, setAdminPassword ] = useState("")
  const [ isLoggingIn, setIsLoggingIn ] = useState(false)
  const [ loginError, setLoginError ] = useState<string | null>(null)
  const [ items, setItems ] = useState<UploadItem[]>([])
  const [ isDragging, setIsDragging ] = useState(false)
  const [ expiresIn, setExpiresIn ] = useState<string | null>(null)
  const [ maxViews, setMaxViews ] = useState("")
  const [ password, setPassword ] = useState("")
  const [ links, setLinks ] = useState<HostedFile[] | null>(null)
  const [ linksError, setLinksError ] = useState<string | null>(null)
  const [ isLoadingLinks, setIsLoadingLinks ] = useState(false)
  const [ armedDeleteId, setArmedDeleteId ] = useState<string | null>(null)
  const [ deletingIds, setDeletingIds ] = useState<string[]>([])
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
    items.forEach((item) => item.controller.abort())
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
      progress: 0,
      result: null,
      status: tooLarge ? "error" : "uploading"
    }, ...currentItems ])

    if (tooLarge) return

    FileHostApi.upload(file, options, (progress) => updateItem(id, { progress }), controller.signal).then((result) => {
      updateItem(id, { progress: 1, result, status: "done" })
      fetchLinks()
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
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => NotificationManager.notify({ message: "Link copied.", tone: "success" })).catch(() => NotificationManager.notify({ message: "Couldn't copy the link.", tone: "error" }))
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  if (isAuthed === null) return null

  if (! isAuthed) return (
    <main className="relative grid min-h-screen place-items-center px-5 py-8">
      <section className="glass-card w-full max-w-[460px] p-6 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-[#70a7ff]">
            <Upload className="h-6 w-6" aria-hidden="true"/>
          </div>
          <h1 className="gradient-text text-3xl font-extrabold">
            File Host
          </h1>
        </div>

        <form className="mt-5 flex flex-col gap-5" onSubmit={ handleLogin }>
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
            { isLoggingIn ? "Connecting..." : "Login" }
          </ActionButton>
        </form>
      </section>
    </main>
  )

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card mx-auto flex w-full max-w-3xl flex-col px-8 py-7 sm:px-9 sm:py-8">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/10 bg-[#111116] text-[#70a7ff] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <Upload className="h-6 w-6" aria-hidden="true"/>
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-xl font-bold leading-none tracking-tight text-white">File Host</h1>
              <p className="mt-1 text-xs font-medium text-zinc-500">Upload files and get a share link</p>
            </div>
          </div>
          <ActionButton
            className="h-9 min-h-9 rounded-xl px-3 py-0 text-[10px] font-bold uppercase tracking-wider"
            icon={ <LogOut className="h-3.5 w-3.5" aria-hidden="true"/> }
            onClick={ handleLogout }
            variant="secondary"
          >
            Logout
          </ActionButton>
        </div>

        <div className="flex flex-col gap-5 text-left">
          <div>
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
              <Clock className="h-3.5 w-3.5" aria-hidden="true"/>
              <span>Expires</span>
            </span>
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-1.5">
              { EXPIRY_OPTIONS.map((option) => (
                <button
                  aria-pressed={ expiresIn === option.value }
                  className={ `inline-flex min-h-9 flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-300 ${
                    expiresIn === option.value
                      ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.24)]"
                      : "text-white/50 hover:bg-[#60a5fa]/5 hover:text-white/80"
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              autoComplete="off"
              icon={ <Eye className="h-3.5 w-3.5" aria-hidden="true"/> }
              inputMode="numeric"
              label="Max Views"
              onChange={ (event) => setMaxViews(event.target.value.replace(/\D/g, "")) }
              placeholder="Unlimited"
              value={ maxViews }
            />
            <TextField
              autoComplete="new-password"
              icon={ <Lock className="h-3.5 w-3.5" aria-hidden="true"/> }
              label="Password"
              onChange={ (event) => setPassword(event.target.value) }
              placeholder="None"
              type="password"
              value={ password }
            />
          </div>

          <label
            className={ `flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center transition duration-200 ${
              isDragging
                ? "border-cyan-300/60 bg-cyan-400/10"
                : "border-white/15 bg-white/[0.035] hover:border-white/30 hover:bg-white/[0.05]"
            }` }
            onDragLeave={ () => setIsDragging(false) }
            onDragOver={ (event) => {
              event.preventDefault()
              setIsDragging(true)
            } }
            onDrop={ handleDrop }
          >
            <Upload className="h-8 w-8 text-white/40" aria-hidden="true"/>
            <span className="text-sm font-semibold text-white">Drop files here or click to choose</span>
            <span className="text-xs text-white/40">Up to { formatSize(FileHostApi.MAX_FILE_SIZE) } per file</span>
            <input
              className="hidden"
              multiple
              onChange={ (event) => {
                addFiles(event.target.files)
                event.target.value = ""
              } }
              type="file"
            />
          </label>

          { items.length > 0 ? (
            <ul className="flex flex-col gap-3">
              { items.map((item) => {
                const { result } = item

                return (
                  <li className="animate-panel-in rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3" key={ item.id }>
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true"/>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{ item.file.name }</p>
                        <p className="text-xs text-white/40">{ formatSize(item.file.size) }</p>
                      </div>
                      { result ? (
                        <>
                          <ActionButton
                            aria-label="Copy link"
                            className="h-9 min-h-9 w-9 rounded-lg px-0 py-0"
                            icon={ <Copy className="h-3.5 w-3.5" aria-hidden="true"/> }
                            onClick={ () => copyLink(result.url) }
                            variant="ghost"
                          />
                          <a
                            aria-label="Open file"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white"
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
                        className="h-9 min-h-9 w-9 rounded-lg px-0 py-0"
                        icon={ <X className="h-3.5 w-3.5" aria-hidden="true"/> }
                        onClick={ () => removeItem(item) }
                        variant="ghost"
                      />
                    </div>

                    { item.status === "uploading" ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
                          style={ { width: `${ Math.round(item.progress * 100) }%` } }
                        />
                      </div>
                    ) : null }

                    { result ? (
                      <button
                        className="mt-2 block w-full truncate rounded-lg border border-white/10 bg-black/15 px-2 py-1 text-left font-mono text-[11px] text-white/55 transition hover:text-white/80"
                        onClick={ () => copyLink(result.url) }
                        type="button"
                      >
                        { result.url }
                      </button>
                    ) : null }

                    { item.error ? (
                      <p className="mt-2 text-xs text-red-200" role="alert">{ item.error }</p>
                    ) : null }
                  </li>
                )
              }) }
            </ul>
          ) : null }

          <div className="border-t border-white/[0.04] pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true"/>
                <span>Active Links{ links ? ` (${ links.length })` : "" }</span>
              </span>
              <ActionButton
                aria-label="Refresh links"
                className="h-9 min-h-9 w-9 rounded-lg px-0 py-0"
                disabled={ isLoadingLinks }
                icon={ <RefreshCw className={ `h-3.5 w-3.5 ${ isLoadingLinks ? "animate-spin" : "" }` } aria-hidden="true"/> }
                onClick={ refreshLinks }
                variant="ghost"
              />
            </div>

            <StatusBanner message={ linksError } tone="error"/>

            { links?.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-6 text-center text-sm text-white/40">No active links.</p>
            ) : null }

            { links?.length ? (
              <ul className="flex flex-col gap-2">
                { links.map((link) => {
                  const isArmed = armedDeleteId === link.id

                  return (
                    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3" key={ link.id }>
                      { link.password
                        ? <Lock className="h-4 w-4 shrink-0 text-white/40" aria-label="Password protected"/>
                        : <FileIcon className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true"/> }
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{ link.name }</p>
                        <p className="truncate text-xs text-white/40">
                          { formatSize(link.size) }
                          { ` · ${ link.views }${ link.maxViews === null ? "" : `/${ link.maxViews }` } views` }
                          { link.deletesAt ? ` · expires ${ formatDate(link.deletesAt) }` : "" }
                        </p>
                      </div>
                      <ActionButton
                        aria-label="Copy link"
                        className="h-9 min-h-9 w-9 rounded-lg px-0 py-0"
                        icon={ <Copy className="h-3.5 w-3.5" aria-hidden="true"/> }
                        onClick={ () => copyLink(link.url) }
                        variant="ghost"
                      />
                      <a
                        aria-label="Open file"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                        href={ link.url }
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true"/>
                      </a>
                      <ActionButton
                        aria-label={ isArmed ? "Click again to delete" : "Delete" }
                        className={ `h-9 min-h-9 rounded-lg py-0 ${ isArmed ? "px-3 text-red-300" : "w-9 px-0" }` }
                        disabled={ deletingIds.includes(link.id) }
                        icon={ <Trash2 className="h-3.5 w-3.5" aria-hidden="true"/> }
                        onClick={ () => handleDelete(link) }
                        variant="ghost"
                      >
                        { isArmed ? "Delete?" : null }
                      </ActionButton>
                    </li>
                  )
                }) }
              </ul>
            ) : null }
          </div>
        </div>
      </section>
    </main>
  )
}
