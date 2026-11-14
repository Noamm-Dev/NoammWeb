import { NoammApiError } from "./NoammApi.ts"

export interface UploadedFile {
  id: string
  url: string
  raw: string
  deletesAt: string | null
  pending: boolean
}

export interface UploadOptions {
  expiresIn: string | null
  maxViews: string
  password: string
}

interface UploadResponse {
  error?: string
  files?: UploadedFile[]
}

interface SessionResponse {
  authenticated?: boolean
  error?: string
}

class FileHostApi {
  readonly baseURL = import.meta.env.DEV ? "/filehost-api" : "https://upload.noamm.org"
  // Cloudflare rejects request bodies over 100MB before they reach the file host API
  readonly MAX_FILE_SIZE = 95 * 1024 * 1024

  async isLoggedIn() {
    return (await this.session({ method: "GET" })).authenticated === true
  }

  async login(password: string) {
    await this.session({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    })
  }

  async logout() {
    await this.session({ method: "DELETE" })
  }

  // XHR instead of fetch because fetch can't report upload progress.
  // The API streams the file as it arrives, so the options have to come before it.
  upload(file: File, options: UploadOptions, onProgress: (progress: number) => void, signal: AbortSignal) {
    const form = new FormData()
    if (options.expiresIn) form.append("expiresIn", options.expiresIn)
    if (options.maxViews) form.append("maxViews", options.maxViews)
    if (options.password) form.append("password", options.password)
    form.append("file", file, file.name)

    return new Promise<UploadedFile>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open("POST", `${ this.baseURL }/upload`)
      request.responseType = "json"
      request.withCredentials = true

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total)
      }

      request.onload = () => {
        const data = request.response as UploadResponse | null
        const uploaded = data?.files?.[0]
        if (request.status >= 200 && request.status < 300 && uploaded) return resolve(uploaded)
        if (request.status === 413) return reject(new NoammApiError(413, "File is too large.", data))
        reject(new NoammApiError(request.status, data?.error ?? `Upload failed (HTTP ${ request.status }).`, data))
      }

      request.onerror = () => reject(new NoammApiError(0, "Network error while uploading.", null))
      request.onabort = () => reject(new NoammApiError(0, "Upload cancelled.", null))
      signal.addEventListener("abort", () => request.abort())

      request.send(form)
    })
  }

  private async session(init: RequestInit) {
    const response = await fetch(`${ this.baseURL }/upload/session`, { ...init, credentials: "include" })
    const data = await response.json().catch(() => null) as SessionResponse | null
    if (! response.ok) throw new NoammApiError(response.status, data?.error ?? `HTTP ${ response.status }`, data)
    return data ?? {}
  }
}

export default new FileHostApi()
