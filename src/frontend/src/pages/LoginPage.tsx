import { CheckCircle2, Copy, KeyRound, LogIn, Timer, UserRound } from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import noammHelm from "../assets/noamm-helm.png"
import { ActionButton } from "../components/ActionButton"
import { OtpCodeInput } from "../components/OtpCodeInput"
import { SiteCredit } from "../components/SiteCredit"
import { TextField } from "../components/TextField"
import AuthSession from "../lib/AuthSession"
import { notify } from "../lib/notifications"
import noammApi from "../lib/NoammApi.ts"
import NoammApi from "../lib/NoammApi.ts"
import { dashedUUID, isMinecraftUsername, isMinecraftUuid, lookupMinecraftUsername } from "../lib/minecraft-profile"
import type { ProfilePlayer } from "../types/profile"
import { formatTime, getErrorMessage } from '../utils.ts'

const AUTH_SERVER_ADDRESS = "auth.mc-id.com"

function buildPlayer(uuid: string, username: string | null): ProfilePlayer {
  return {
    aliases: username ? [ username ] : [],
    displayName: null,
    scale: null,
    username,
    uuid
  }
}

async function resolvePlayer(identifier: string) {
  const normalizedIdentifier = identifier.trim()

  if (isMinecraftUuid(normalizedIdentifier)) {
    const uuid = dashedUUID(normalizedIdentifier)
    if (! uuid) return null
    return buildPlayer(uuid, null)
  }

  if (! isMinecraftUsername(normalizedIdentifier)) return null
  const profile = await lookupMinecraftUsername(normalizedIdentifier)
  if (! profile) return null

  return buildPlayer(profile.uuid, profile.name)
}

export function LoginPage() {
  const navigate = useNavigate()
  const [ identifier, setIdentifier ] = useState("")
  const [ code, setCode ] = useState("")
  const [ requestedPlayer, setRequestedPlayer ] = useState<ProfilePlayer | null>(null)
  const [ isRequestingCode, setIsRequestingCode ] = useState(false)
  const [ isVerifyingCode, setIsVerifyingCode ] = useState(false)
  const [ codeExpiresAt, setCodeExpiresAt ] = useState<number | null>(null)
  const [ codeRemainingMs, setCodeRemainingMs ] = useState<number | null>(null)
  const [ errorMessage, setErrorMessage ] = useState<string | null>(null)
  const [ successMessage, setSuccessMessage ] = useState<string | null>(null)

  const normalizedCode = useMemo(() => code.trim(), [ code ])
  const codeLength = noammApi.authConfig.codeLength
  const isCodeExpired = codeRemainingMs !== null && codeRemainingMs <= 0

  useEffect(() => {
    if (AuthSession.read()) navigate("/me", { replace: true })
  }, [ navigate ])

  useEffect(() => {
    notify({ message: errorMessage, tone: "error" })
  }, [ errorMessage ])

  useEffect(() => {
    notify({ message: successMessage, tone: "success" })
  }, [ successMessage ])

  useEffect(() => {
    if (! codeExpiresAt) return
    const expiresAt = codeExpiresAt

    const syncRemainingTime = () => setCodeRemainingMs(Math.max(0, expiresAt - Date.now()))

    syncRemainingTime()
    const intervalId = window.setInterval(syncRemainingTime, 1000)

    return () => window.clearInterval(intervalId)
  }, [ codeExpiresAt ])

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsRequestingCode(true)

    try {
      const player = await resolvePlayer(identifier)
      if (! player) return setErrorMessage("Enter a valid Minecraft username or UUID.")

      await noammApi.requestMcIdCode(player.uuid)
      setRequestedPlayer(player)
      setCode("")
      setCodeExpiresAt(Date.now() + NoammApi.authConfig.codeTTL * 1000)
      setSuccessMessage(null)
    }
    catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
    finally {
      setIsRequestingCode(false)
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (! requestedPlayer) return setErrorMessage("Request a code first.")
    if (isCodeExpired) return setErrorMessage("The MC-ID code expired. Request a new one.")
    if (! new RegExp(`^\\d{${ codeLength }}$`).test(normalizedCode)) {
      return setErrorMessage(`Enter the ${ codeLength }-digit MC-ID code.`)
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    setIsVerifyingCode(true)

    try {
      const session = await noammApi.verifyMcIdCode(requestedPlayer.uuid, normalizedCode)
      if (! session.authenticated) return setErrorMessage("The auth response did not include a valid session.")
      if (session.authenticated && ! session.authorized) return setErrorMessage(session.error)
      if (! session.apiKey) return setErrorMessage("The auth response did not include a token.")

      AuthSession.save({
        player: session.player,
        apiKey: session.apiKey,
        expiresAt: (session.expiresIn * 1000) + Date.now()
      })

      if (! AuthSession.read()) return setErrorMessage("Unable to store the MC-ID session.")
      navigate("/me", { replace: true })
    }
    catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
    finally {
      setIsVerifyingCode(false)
    }
  }

  async function handleCopyServer() {
    try {
      await navigator.clipboard.writeText(AUTH_SERVER_ADDRESS)
      setSuccessMessage("Server address copied.")
    }
    catch {
      setErrorMessage("Unable to copy the server address.")
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-8">
      <section className="glass-card w-full max-w-[520px] p-6 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.045]">
            <img alt="" className="h-8 w-8 rounded-md" src={ noammHelm }/>
          </div>
          <h1 className="gradient-text text-3xl font-extrabold">MC-ID Login</h1>
        </div>

        { ! requestedPlayer ? (
          <form className="mt-5 grid gap-5" onSubmit={ handleRequestCode }>
            <TextField
              disabled={ isRequestingCode || isVerifyingCode }
              icon={ <UserRound className="h-3.5 w-3.5" aria-hidden="true"/> }
              label="Minecraft Account"
              onChange={ event => setIdentifier(event.target.value) }
              placeholder="Username or UUID"
              value={ identifier }
            />

            <ActionButton
              disabled={ isRequestingCode || isVerifyingCode }
              icon={ <KeyRound className="h-4 w-4" aria-hidden="true"/> }
              type="submit"
              variant="primary"
            >
              { isRequestingCode ? "Requesting..." : "Request Code" }
            </ActionButton>
          </form>
        ) : null }

        { requestedPlayer ? (
          <form className="mt-6 grid gap-5" onSubmit={ handleVerifyCode }>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">
                    Minecraft Server
                  </p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold text-white">
                    { AUTH_SERVER_ADDRESS }
                  </p>
                  <p className="mt-2 text-sm leading-5 text-white/45">
                    Launch Minecraft and connect to the server.
                    You will be kicked from the server and receive a code.
                  </p>
                </div>
                <ActionButton
                  aria-label="Copy server address"
                  className="h-10 min-h-10 w-10 px-0 py-0"
                  icon={ <Copy className="h-4 w-4" aria-hidden="true"/> }
                  onClick={ () => void handleCopyServer() }
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase text-white/60">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true"/>
                  <span>Verification Code</span>
                </span>

                { codeRemainingMs !== null ? (
                  <span className={ `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-extrabold ${
                    isCodeExpired
                      ? "border-red-400/25 bg-red-500/10 text-red-100"
                      : "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100"
                  }` }>
                    <Timer className="h-3.5 w-3.5" aria-hidden="true"/>
                    { formatTime(codeRemainingMs) }
                  </span>
                ) : null }
              </div>
              <OtpCodeInput
                disabled={ isVerifyingCode || isCodeExpired }
                id="verification-code"
                length={ codeLength }
                onChange={ setCode }
                value={ code }
              />
            </div>

            <ActionButton
              disabled={
                isVerifyingCode || isCodeExpired || normalizedCode.length !== codeLength
              }
              icon={ <LogIn className="h-4 w-4" aria-hidden="true"/> }
              type="submit"
              variant="primary"
            >
              { isVerifyingCode ? "Verifying..." : "Login" }
            </ActionButton>
          </form>
        ) : null }

        <SiteCredit className="mt-6"/>
      </section>
    </main>
  )
}
