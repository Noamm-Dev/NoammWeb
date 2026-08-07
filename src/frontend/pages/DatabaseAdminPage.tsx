import { Database, KeyRound, LogOut, Menu, Plus, RefreshCw, Search, Square, Trash2, X } from "lucide-react"
import { type FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import noammHelm from "../assets/noamm-helm.png"
import { ActionButton } from "../components/ActionButton"
import { DatabaseAddChoiceModal } from "../components/DatabaseAddChoiceModal"
import { DatabaseEntryModal } from "../components/DatabaseEntryModal"
import { DatabaseEntryRow } from "../components/DatabaseEntryRow"
import { DatabaseOwnerOnlyRow } from "../components/DatabaseOwnerOnlyRow"
import { DatabaseOwnerModal, type DatabaseOwnerPayload } from "../components/DatabaseOwnerModal"
import { SiteCredit } from "../components/SiteCredit"
import { TextField } from "../components/TextField"
import MinecraftApi, { type MinecraftProfile } from "../lib/MinecraftApi"
import { getPlainMinecraftText } from "../lib/minecraft-text"
import NotificationManager from "../lib/NotificationManager"
import DatabaseEntry, { type DatabaseOwner } from "../types/DatabaseEntry"
import { STORAGE_KEY } from '../content/database'
import { getErrorMessage } from '../utils.ts'
import NoammApi, { NoammApiError } from '../lib/NoammApi.ts'

type EntryDialogState = | { mode: "add", uuid?: string } | { entry: DatabaseEntry, mode: "edit", uuid: string }
type OwnerDeleteDialogState = { owner: DatabaseOwner, uuid: string }
type OwnerDialogState = { owner?: DatabaseOwner, uuid?: string, uuidReadOnly?: boolean }

type MinecraftLookupState =
  | { query: string; status: "loading" }
  | { profile: MinecraftProfile, query: string, status: "resolved" }
  | { query: string, status: "not_found" }
  | { message: string, query: string; status: "error" }

const DELETE_CONFIRM_LABELS = [
  "Are you sure?",
  "Are you reallyyyy sure?",
  "Are you really really sure?"
] as const

const DEFAULT_OWNER: DatabaseOwner = { hasName: false, hasSize: false }

interface DatabaseMenuContentProps {
  isLoading: boolean
  onLogout: () => void
  onRefresh: () => void
  stats: {
    money: number
    namedEntries: number
    scaledEntries: number
    totalEntries: number
  }
}

const DatabaseMenuContent = ({ isLoading, onLogout, onRefresh, stats }: DatabaseMenuContentProps) => (
  <>
    <div className="flex items-center gap-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.045]">
        <img alt="" className="h-8 w-8 rounded-md" src={ noammHelm }/>
      </div>
      <div className="min-w-0">
        <h1 className="gradient-text text-2xl font-extrabold leading-tight">
          Database
        </h1>
      </div>
    </div>

    <div className="mt-6 grid gap-3">
      { [
        [ "Total", stats.totalEntries ],
        [ "Names", stats.namedEntries ],
        [ "Sizes", stats.scaledEntries ],
        [ "Money", `~${ stats.money }$` ]
      ].map(([ label, value ]) => (
        <div
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
          key={ label }
        >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">
              { label }
            </span>
          <span className="text-xl font-extrabold text-white">{ value }</span>
        </div>
      )) }
    </div>

    <div className="mt-6 grid gap-2">
      <ActionButton
        disabled={ isLoading }
        icon={ <RefreshCw className="h-4 w-4" aria-hidden="true"/> }
        onClick={ onRefresh }
        variant="primary"
      >
        Refresh
      </ActionButton>
      <ActionButton
        icon={ <LogOut className="h-4 w-4" aria-hidden="true"/> }
        onClick={ onLogout }
      >
        Logout
      </ActionButton>
    </div>
  </>
)

export function DatabaseAdminPage() {
  const [ authToken, setAuthToken ] = useState(() => window.localStorage.getItem(STORAGE_KEY) || "")
  const [ password, setPassword ] = useState("")
  const [ entries, setEntries ] = useState<Record<string, DatabaseEntry>>({})
  const [ owners, setOwners ] = useState<Record<string, DatabaseOwner>>({})
  const [ searchTerm, setSearchTerm ] = useState("")
  const [ isLoading, setIsLoading ] = useState(Boolean(authToken))
  const [ isSavingEntry, setIsSavingEntry ] = useState(false)
  const [ isSavingOwner, setIsSavingOwner ] = useState(false)
  const [ deletingUuid, setDeletingUuid ] = useState<string | null>(null)
  const [ deletingOwnerUuid, setDeletingOwnerUuid ] = useState<string | null>(null)
  const [ ownerDeleteConfirmStep, setOwnerDeleteConfirmStep ] = useState(0)
  const [ isAddChoiceOpen, setIsAddChoiceOpen ] = useState(false)
  const [ ownerDeleteDialog, setOwnerDeleteDialog ] = useState<OwnerDeleteDialogState | null>(null)
  const [ entryDialog, setEntryDialog ] = useState<EntryDialogState | null>(null)
  const [ ownerDialog, setOwnerDialog ] = useState<OwnerDialogState | null>(null)
  const [ isMobileMenuOpen, setIsMobileMenuOpen ] = useState(false)
  const [ minecraftLookup, setMinecraftLookup ] = useState<MinecraftLookupState | null>(null)
  const [ isRunningUpdate, setIsRunningUpdate ] = useState(false)
  const [ updateLog, setUpdateLog ] = useState<string[]>([])
  const [ clearingRateLimitUuid, setClearingRateLimitUuid ] = useState<string | null>(null)
  const [ errorMessage, setErrorMessage ] = useState<string | null>(null)
  const [ successMessage, setSuccessMessage ] = useState<string | null>(null)

  const deferredSearchTerm = useDeferredValue(searchTerm)
  const updateAbortRef = useRef<AbortController | null>(null)
  const updateLogRef = useRef<HTMLDivElement | null>(null)
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase()

  useEffect(() => {
    const searchInput = document.getElementById("database-search-input")

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault()
        if (document.activeElement === searchInput) searchInput?.blur()
        else searchInput?.focus()
      }
      else if (event.key === "Escape" && document.activeElement === searchInput) {
        searchInput?.blur()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setAuthToken("")
    setEntries({})
    setOwners({})
    setIsAddChoiceOpen(false)
    setEntryDialog(null)
    setOwnerDialog(null)
    setOwnerDeleteDialog(null)
    setOwnerDeleteConfirmStep(0)
  }, [])

  const loadEntries = useCallback(async (token: string, options: { showLoading?: boolean } = {}) => {
      if (options.showLoading ?? true) setIsLoading(true)

      try {
        const database = await NoammApi.getDatabase(token)
        setEntries(database.entries)
        setOwners(database.owners)
        setErrorMessage(null)
        return true
      }
      catch (error) {
        if (error instanceof NoammApiError && error.status === 401) clearSession()
        setErrorMessage(getErrorMessage(error))
        return false
      }
      finally {
        setIsLoading(false)
      }
    },
    [ clearSession ]
  )

  useEffect(() => {
    if (! authToken) return
    const timeoutId = window.setTimeout(() => void loadEntries(authToken, { showLoading: true }), 0)
    return () => window.clearTimeout(timeoutId)
  }, [ authToken, loadEntries ])

  useEffect(() => NotificationManager.notify({ message: errorMessage, tone: "error" }), [ errorMessage ])
  useEffect(() => NotificationManager.notify({ message: successMessage, tone: "success" }), [ successMessage ])

  useEffect(() => {
    const logElement = updateLogRef.current
    if (! logElement) return
    logElement.scrollTop = logElement.scrollHeight
  }, [ updateLog ])

  useEffect(() => () => updateAbortRef.current?.abort(), [])

  useEffect(() => {
    if (! isMobileMenuOpen) return

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [ isMobileMenuOpen ])

  useEffect(() => {
    if (! ownerDeleteDialog) return

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ! deletingOwnerUuid) setOwnerDeleteDialog(null)
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [ ownerDeleteDialog, deletingOwnerUuid ])

  useEffect(() => {
    if (! MinecraftApi.isMinecraftUsername(normalizedSearchTerm)) return

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setMinecraftLookup({ query: normalizedSearchTerm, status: "loading" })

      void MinecraftApi.getPlayer(normalizedSearchTerm, abortController.signal).then((profile) => {
        if (abortController.signal.aborted) return
        setMinecraftLookup(profile ? { profile, query: normalizedSearchTerm, status: "resolved" } : { query: normalizedSearchTerm, status: "not_found" })
      }).catch((error: unknown) => {
        if (abortController.signal.aborted) return
        setMinecraftLookup({ message: getErrorMessage(error), query: normalizedSearchTerm, status: "error" })
      })
    }, 350)

    return () => {
      abortController.abort()
      window.clearTimeout(timeoutId)
    }
  }, [ normalizedSearchTerm ])

  const activeMinecraftLookup = minecraftLookup?.query === normalizedSearchTerm ? minecraftLookup : null
  const resolvedSearchUuid = activeMinecraftLookup?.status === "resolved" ? MinecraftApi.normalizeUuid(activeMinecraftLookup.profile.uuid) : null

  const sortedEntries = useMemo(() => Object.entries(entries), [ entries ])
  const sortedOwners = useMemo(() => Object.entries(owners), [ owners ])
  const searchableEntries = useMemo(() => {
    return sortedEntries.map(([ uuid, entry ]) => {
      const plainDisplayName = getPlainMinecraftText(entry.getName())

      return {
        entry,
        hasName: entry.hasCustomName(),
        hasScale: entry.hasCustomScale(),
        normalizedUuid: MinecraftApi.normalizeUuid(uuid),
        searchText: [ uuid, uuid.replaceAll("-", ""), entry.getName(), plainDisplayName ].join(" ").toLowerCase(),
        uuid
      }
    })
  }, [ sortedEntries ])

  const ownerOnlyItems = useMemo(() => {
    return sortedOwners.filter(([ uuid ]) => ! entries[uuid]).map(([ uuid, owner ]) => ({
      hasName: owner.hasName,
      hasScale: owner.hasSize,
      normalizedUuid: MinecraftApi.normalizeUuid(uuid),
      owner,
      searchText: [ uuid, uuid.replaceAll("-", "") ].join(" ").toLowerCase(),
      uuid
    }))
  }, [ entries, sortedOwners ])

  const filteredEntries = useMemo(() => {
    if (! normalizedSearchTerm) return searchableEntries

    return searchableEntries.filter((item) => {
      const textMatches = item.searchText.includes(normalizedSearchTerm)
      const minecraftUsernameMatches = resolvedSearchUuid ? item.normalizedUuid === resolvedSearchUuid : false
      return textMatches || minecraftUsernameMatches
    })
  }, [ normalizedSearchTerm, resolvedSearchUuid, searchableEntries ])

  const filteredOwnerOnlyItems = useMemo(() => {
    if (! normalizedSearchTerm) return ownerOnlyItems

    return ownerOnlyItems.filter((item) => {
      const textMatches = item.searchText.includes(normalizedSearchTerm)
      const minecraftUsernameMatches = resolvedSearchUuid ? item.normalizedUuid === resolvedSearchUuid : false
      return textMatches || minecraftUsernameMatches
    })
  }, [ normalizedSearchTerm, ownerOnlyItems, resolvedSearchUuid ])

  const stats = useMemo(() => {
    const ownerEntries = Object.values(owners)
    const names = ownerEntries.filter(it => it.hasName).length
    const sizes = ownerEntries.filter(it => it.hasSize).length
    const total = names + sizes
    const profit = total * 10

    return {
      money: profit,
      namedEntries: names,
      scaledEntries: sizes,
      totalEntries: total
    }
  }, [ ownerOnlyItems, searchableEntries ])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextToken = password.trim()
    if (! nextToken) return setErrorMessage("The admin password is required.")

    setSuccessMessage(null)
    const isLoaded = await loadEntries(nextToken, { showLoading: true })
    if (! isLoaded) return

    window.localStorage.setItem(STORAGE_KEY, nextToken)
    setAuthToken(nextToken)
    setPassword("")
    setSuccessMessage("Admin session is active.")
  }

  const handleRefresh = useCallback(async () => {
    setSuccessMessage(null)
    const isLoaded = await loadEntries(authToken, { showLoading: true })
    if (isLoaded) setSuccessMessage("Database refreshed.")
  }, [ authToken, loadEntries ])

  const handleLogout = useCallback(() => {
    clearSession()
    setPassword("")
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsMobileMenuOpen(false)
  }, [ clearSession ])

  const handleOpenAddChoice = useCallback(() => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsAddChoiceOpen(true)
  }, [])

  const handleSelectEntryAdd = useCallback(() => {
    setIsAddChoiceOpen(false)
    setEntryDialog({ mode: "add" })
  }, [])

  const handleSelectOwnerAdd = useCallback(() => {
    setIsAddChoiceOpen(false)
    setOwnerDialog({})
  }, [])

  const handleEditEntry = useCallback((uuid: string, entry: DatabaseEntry) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setEntryDialog({ entry, mode: "edit", uuid })
  }, [])

  const handleCreateEntryFromOwner = useCallback((uuid: string) => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setEntryDialog({ mode: "add", uuid })
  }, [])

  const handleSaveEntry = useCallback(async (uuid: string, entry: DatabaseEntry) => {
      setIsSavingEntry(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      try {
        await NoammApi.saveEntry(uuid, authToken, entry)

        setEntries((currentEntries) => ({ ...currentEntries, [uuid]: entry }))
        setEntryDialog(null)
        setErrorMessage(null)
        setSuccessMessage("Entry saved.")
        return null
      }
      catch (error) {
        if (error instanceof NoammApiError && error.status === 401) {
          const message = getErrorMessage(error)
          clearSession()
          setErrorMessage(message)
          return null
        }

        const message = getErrorMessage(error)
        setErrorMessage(message)
        return message
      }
      finally {
        setIsSavingEntry(false)
      }
    },
    [ authToken, clearSession ]
  )

  const handleSaveOwner = useCallback(async (payload: DatabaseOwnerPayload) => {
    setIsSavingOwner(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const owner: DatabaseOwner = {
        hasName: payload.hasName,
        hasSize: payload.hasSize
      }

      await NoammApi.saveOwner(payload.uuid, authToken, owner)

      setOwners((currentOwners) => ({ ...currentOwners, [payload.uuid]: owner }))
      setOwnerDialog(null)
      setErrorMessage(null)
      setSuccessMessage("Owner saved.")
      return null
    }
    catch (error) {
      if (error instanceof NoammApiError && error.status === 401) {
        const message = getErrorMessage(error)
        clearSession()
        setErrorMessage(message)
        return null
      }

      const message = getErrorMessage(error)
      setErrorMessage(message)
      return message
    }
    finally {
      setIsSavingOwner(false)
    }
  }, [ authToken, clearSession ])

  const handleSaveEntryOwnerSettings = useCallback(async (uuid: string, owner: DatabaseOwner) => {
    setIsSavingOwner(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await NoammApi.saveOwner(uuid, authToken, owner)

      setOwners((currentOwners) => ({ ...currentOwners, [uuid]: owner }))
      setErrorMessage(null)
      setSuccessMessage("Owner saved.")
      return null
    }
    catch (error) {
      if (error instanceof NoammApiError && error.status === 401) {
        const message = getErrorMessage(error)
        clearSession()
        setErrorMessage(message)
        return null
      }

      const message = getErrorMessage(error)
      setErrorMessage(message)
      return message
    }
    finally {
      setIsSavingOwner(false)
    }
  }, [ authToken, clearSession ])

  const handleDeleteEntryFromSettings = useCallback(async (uuid: string) => {
    setDeletingUuid(uuid)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await NoammApi.deleteEntry(uuid, authToken)

      setEntries((currentEntries) => {
        const nextEntries = { ...currentEntries }
        delete nextEntries[uuid]
        return nextEntries
      })
      setErrorMessage(null)
      setSuccessMessage("Entry deleted.")
      return null
    }
    catch (error) {
      if (error instanceof NoammApiError && error.status === 401) {
        const message = getErrorMessage(error)
        clearSession()
        setErrorMessage(message)
        return null
      }

      const message = getErrorMessage(error)
      setErrorMessage(message)
      return message
    }
    finally {
      setDeletingUuid(null)
    }
  }, [ authToken, clearSession ])

  const handleDeleteOwner = useCallback((uuid: string) => {
    const owner = owners[uuid]
    if (! owner) return setErrorMessage("This owner entry was not found.")

    setErrorMessage(null)
    setSuccessMessage(null)
    setOwnerDeleteConfirmStep(0)
    setOwnerDeleteDialog({ owner, uuid })
  }, [ owners ])

  const handleCloseOwnerDeleteDialog = useCallback(() => {
    if (deletingOwnerUuid) return
    setOwnerDeleteDialog(null)
    setOwnerDeleteConfirmStep(0)
  }, [ deletingOwnerUuid ])

  const handleConfirmDeleteOwner = useCallback(async () => {
    if (! ownerDeleteDialog) return
    if (ownerDeleteConfirmStep < DELETE_CONFIRM_LABELS.length - 1) {
      setOwnerDeleteConfirmStep((currentStep) => currentStep + 1)
      return
    }

    const { uuid } = ownerDeleteDialog

    setDeletingOwnerUuid(uuid)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await NoammApi.deleteOwner(uuid, authToken)

      setOwners((currentOwners) => {
        const nextOwners = { ...currentOwners }
        delete nextOwners[uuid]
        return nextOwners
      })
      setOwnerDeleteDialog(null)
      setOwnerDeleteConfirmStep(0)
      setErrorMessage(null)
      setSuccessMessage("Owner deleted.")
    }
    catch (error) {
      if (error instanceof NoammApiError && error.status === 401) clearSession()
      setErrorMessage(getErrorMessage(error))
    }
    finally {
      setDeletingOwnerUuid(null)
    }
  }, [ authToken, clearSession, ownerDeleteConfirmStep, ownerDeleteDialog ])

  const handleClearRateLimit = useCallback(async (uuid: string) => {
    if (clearingRateLimitUuid) return
    setClearingRateLimitUuid(uuid)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await NoammApi.clearRateLimit(uuid, authToken)
      setSuccessMessage("Rate limit cleared.")
    }
    catch (error) {
      if (error instanceof NoammApiError && error.status === 401) clearSession()
      setErrorMessage(getErrorMessage(error))
    }
    finally {
      setClearingRateLimitUuid(null)
    }
  }, [ authToken, clearSession, clearingRateLimitUuid ])

  const handleRunUpdate = useCallback(async () => {
    if (isRunningUpdate) return
    setIsRunningUpdate(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setUpdateLog([])

    const abortController = new AbortController()
    updateAbortRef.current = abortController

    try {
      await NoammApi.runUpdate(authToken, (message) => {
        setUpdateLog((currentLog) => [ ...currentLog, message ])
      }, abortController.signal)
      setSuccessMessage("Database update finished.")
    }
    catch (error) {
      if (abortController.signal.aborted) {
        setErrorMessage("Database update stopped.")
      }
      else {
        if (error instanceof NoammApiError && error.status === 401) clearSession()
        setErrorMessage(getErrorMessage(error))
      }
    }
    finally {
      updateAbortRef.current = null
      setIsRunningUpdate(false)
    }
  }, [ authToken, clearSession, isRunningUpdate ])

  const handleStopUpdate = useCallback(() => {
    updateAbortRef.current?.abort()
  }, [])

  if (! authToken) return (
    <main className="relative grid min-h-screen place-items-center px-5 py-8">
      <section className="glass-card w-full max-w-[460px] p-6 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.045]">
            <img alt="" className="h-8 w-8 rounded-md" src={ noammHelm }/>
          </div>
          <h1 className="gradient-text text-3xl font-extrabold">
            Database Editor
          </h1>
        </div>

        <form className="mt-5 flex flex-col gap-5" onSubmit={ handleLogin }>
          <TextField
            autoComplete="current-password"
            icon={ <KeyRound className="h-3.5 w-3.5" aria-hidden="true"/> }
            label="Admin Password"
            onChange={ (event) => setPassword(event.target.value) }
            placeholder="Enter Password"
            type="password"
            value={ password }
          />

          <ActionButton
            disabled={ isLoading }
            icon={ <KeyRound className="h-4 w-4" aria-hidden="true"/> }
            type="submit"
            variant="primary"
          >
            { isLoading ? "Connecting..." : "Login" }
          </ActionButton>
        </form>

        <SiteCredit className="mt-6"/>
      </section>
    </main>
  )

  return (
    <main className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto mb-4 flex w-full max-w-[1500px] justify-end xl:hidden">
        <ActionButton
          aria-label="Open database menu"
          className="h-11 w-11 px-0 py-0"
          icon={ <Menu className="h-5 w-5" aria-hidden="true"/> }
          onClick={ () => setIsMobileMenuOpen(true) }
        />
      </div>

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-card hidden h-fit p-5 sm:p-6 xl:block">
          <DatabaseMenuContent
            isLoading={ isLoading }
            onLogout={ handleLogout }
            onRefresh={ handleRefresh }
            stats={ stats }
          />
        </aside>

        <section className="glass-card min-w-0 p-5 sm:p-6">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <TextField
                id="database-search-input"
                icon={ <Search className="h-3.5 w-3.5" aria-hidden="true"/> }
                label="Search"
                onChange={ (event) => setSearchTerm(event.target.value) }
                placeholder="UUID, JSON name, or MC username"
                value={ searchTerm }
              />
            </div>

            <div className="flex shrink-0 gap-2">
              { isRunningUpdate ? (
                <ActionButton
                  className="h-[46px] min-h-[46px]"
                  icon={ <Square className="h-4 w-4" aria-hidden="true"/> }
                  onClick={ handleStopUpdate }
                  variant="danger"
                >
                  Stop
                </ActionButton>
              ) : null }
              <ActionButton
                className="h-[46px] min-h-[46px]"
                disabled={ isRunningUpdate }
                icon={ <RefreshCw className="h-4 w-4" aria-hidden="true"/> }
                onClick={ () => void handleRunUpdate() }
                variant="primary"
              >
                { isRunningUpdate ? "Running..." : "Run update" }
              </ActionButton>
            </div>

            <ActionButton
              className="h-[46px] min-h-[46px] shrink-0"
              icon={ <Plus className="h-4 w-4" aria-hidden="true"/> }
              onClick={ handleOpenAddChoice }
              variant="primary"
            >
              Add
            </ActionButton>
          </div>

          { isRunningUpdate || updateLog.length > 0 ? (
            <div
              className="mt-5 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 font-mono text-[11px] leading-5 text-white/55"
              ref={ updateLogRef }
            >
              { updateLog.map((line, index) => (
                <p className="whitespace-pre-wrap break-all" key={ index }>
                  { line }
                </p>
              )) }
            </div>
          ) : null }

          <div className="mt-5">
            { isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black/15 py-16 text-center text-sm font-semibold text-white/45">
                Loading database...
              </div>
            ) : filteredEntries.length > 0 || filteredOwnerOnlyItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                { filteredEntries.map((item) => (
                  <DatabaseEntryRow
                    entry={ item.entry }
                    isClearingRateLimit={ clearingRateLimitUuid === item.uuid }
                    isDeletingEntry={ deletingUuid === item.uuid }
                    isSavingOwner={ isSavingOwner }
                    key={ item.uuid }
                    onClearRateLimit={ handleClearRateLimit }
                    onDeleteEntry={ handleDeleteEntryFromSettings }
                    onEdit={ handleEditEntry }
                    onSaveOwner={ handleSaveEntryOwnerSettings }
                    owner={ owners[item.uuid] ?? DEFAULT_OWNER }
                    uuid={ item.uuid }
                  />
                )) }
                { filteredOwnerOnlyItems.map((item) => (
                  <DatabaseOwnerOnlyRow
                    isClearingRateLimit={ clearingRateLimitUuid === item.uuid }
                    isDeleting={ deletingOwnerUuid === item.uuid }
                    key={ `owner-${ item.uuid }` }
                    onClearRateLimit={ handleClearRateLimit }
                    onDelete={ handleDeleteOwner }
                    onEditEntry={ handleCreateEntryFromOwner }
                    owner={ item.owner }
                    uuid={ item.uuid }
                  />
                )) }
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/15 py-16 text-center">
                <Database
                  className="mx-auto h-8 w-8 text-white/25"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-white/60">
                  No entries found.
                </p>
              </div>
            ) }
          </div>

          <SiteCredit className="mt-6"/>
        </section>
      </div>

      { isAddChoiceOpen ? (
        <DatabaseAddChoiceModal
          onClose={ () => setIsAddChoiceOpen(false) }
          onSelectEntry={ handleSelectEntryAdd }
          onSelectOwner={ handleSelectOwnerAdd }
        />
      ) : null }

      { entryDialog ? (
        <DatabaseEntryModal
          initialEntry={
            entryDialog.mode === "edit" ? entryDialog.entry : undefined
          }
          initialUuid={
            entryDialog.uuid
          }
          isSaving={ isSavingEntry }
          key={ entryDialog.mode === "edit" ? entryDialog.uuid : `add-entry-${ entryDialog.uuid ?? "new" }` }
          mode={ entryDialog.mode }
          onClose={ () => setEntryDialog(null) }
          onSubmit={ handleSaveEntry }
        />
      ) : null }

      { ownerDialog ? (
        <DatabaseOwnerModal
          initialOwner={ ownerDialog.owner }
          initialUuid={ ownerDialog.uuid }
          isSaving={ isSavingOwner }
          key={ ownerDialog.uuid ?? "new-owner" }
          onClose={ () => setOwnerDialog(null) }
          onSubmit={ handleSaveOwner }
          uuidReadOnly={ ownerDialog.uuidReadOnly }
        />
      ) : null }

      { ownerDeleteDialog ? (
        <div
          aria-labelledby="delete-owner-modal-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center px-4 py-5"
          role="dialog"
        >
          <button
            aria-label="Close owner delete confirmation"
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
            disabled={ Boolean(deletingOwnerUuid) }
            onClick={ handleCloseOwnerDeleteDialog }
            type="button"
          />

          <section className="glass-card animate-panel-in relative z-10 w-full max-w-[460px] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-400/25 bg-red-500/10 text-red-100">
                  <Trash2 className="h-5 w-5" aria-hidden="true"/>
                </div>
                <div>
                  <h2
                    className="text-xl font-extrabold text-white"
                    id="delete-owner-modal-title"
                  >
                    Delete owner
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-white/42">
                    This only deletes owner permissions.
                  </p>
                </div>
              </div>

              <ActionButton
                aria-label="Close"
                className="h-10 min-h-10 w-10 px-0 py-0"
                disabled={ Boolean(deletingOwnerUuid) }
                icon={ <X className="h-4 w-4" aria-hidden="true"/> }
                onClick={ handleCloseOwnerDeleteDialog }
                variant="ghost"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="break-all font-mono text-xs text-white/45">
                { ownerDeleteDialog.uuid }
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={ `inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  ownerDeleteDialog.owner.hasName
                    ? "border-cyan-300/20 bg-cyan-300/[0.075] text-cyan-100/85"
                    : "border-white/10 bg-white/[0.035] text-white/34"
                }` }>
                  hasName
                </span>
                <span className={ `inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  ownerDeleteDialog.owner.hasSize
                    ? "border-cyan-300/20 bg-cyan-300/[0.075] text-cyan-100/85"
                    : "border-white/10 bg-white/[0.035] text-white/34"
                }` }>
                  hasSize
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <ActionButton
                disabled={ Boolean(deletingOwnerUuid) }
                onClick={ handleCloseOwnerDeleteDialog }
              >
                Cancel
              </ActionButton>
              <ActionButton
                disabled={ Boolean(deletingOwnerUuid) }
                icon={ <Trash2 className="h-4 w-4" aria-hidden="true"/> }
                onClick={ handleConfirmDeleteOwner }
                variant="danger"
              >
                { deletingOwnerUuid ? "Deleting..." : DELETE_CONFIRM_LABELS[ownerDeleteConfirmStep] }
              </ActionButton>
            </div>
          </section>
        </div>
      ) : null }

      { isMobileMenuOpen ? (
        <div
          aria-labelledby="database-mobile-menu-title"
          aria-modal="true"
          className="fixed inset-0 z-40 xl:hidden"
          role="dialog"
        >
          <button
            aria-label="Close database menu"
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
            onClick={ () => setIsMobileMenuOpen(false) }
            type="button"
          />

          <aside className="glass-card animate-panel-in absolute right-4 top-4 w-[min(320px,calc(100vw-2rem))] p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <span
                className="text-sm font-semibold uppercase tracking-[0.16em] text-white/40"
                id="database-mobile-menu-title"
              >
                Menu
              </span>
              <ActionButton
                aria-label="Close database menu"
                className="h-10 min-h-10 w-10 px-0 py-0"
                icon={ <X className="h-4 w-4" aria-hidden="true"/> }
                onClick={ () => setIsMobileMenuOpen(false) }
                variant="ghost"
              />
            </div>

            <DatabaseMenuContent
              isLoading={ isLoading }
              onLogout={ handleLogout }
              onRefresh={ () => {
                setIsMobileMenuOpen(false)
                void handleRefresh()
              } }
              stats={ stats }
            />
          </aside>
        </div>
      ) : null }
    </main>
  )
}