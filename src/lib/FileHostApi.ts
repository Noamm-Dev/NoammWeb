import { NoammApiError } from "./NoammApi.ts"

export interface UploadedFile {
  id: string
  url: string
  raw: string
  deletesAt: string | null
  pending: boolean
}

export interface HostedFile {
  id: string
  name: string
  url: string
  raw: string
  size: number
  views: number
  maxViews: number | null
  deletesAt: string | null
  createdAt: string
  password: boolean
}

export interface UploadOptions {
  expiresIn: string | null
  maxViews: string
  password: string
}

interface UploadResponse {
  chunkToken?: string
  error?: string
  files?: UploadedFile[]
}

interface SessionResponse {
  authenticated?: boolean
  error?: string
}

interface FilesResponse {
  error?: string
  files?: HostedFile[]
}

class FileHostApi {
  readonly baseURL = import.meta.env.DEV ? "/filehost-api" : "https://upload.noamm.org"
  readonly MAX_FILE_SIZE = 1000 * 1024 * 1024 * 1024
  // Cloudflare rejects request bodies over 100MB before they reach the file host API, so bigger files go up in chunks
  readonly MAX_REQUEST_SIZE = 95 * 1024 * 1024
  readonly CHUNK_SIZE = 50 * 1024 * 1024

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

  async upload(file: File, options: UploadOptions, onProgress: (progress: number) => void, signal: AbortSignal) {
    if (file.size <= this.MAX_REQUEST_SIZE) return this.uploadedFile(await this.send(this.uploadForm(options, file, file.name), onProgress, signal))

    let chunkToken: string | undefined
    for (let start = 0; ; start += this.CHUNK_SIZE) {
      const end = Math.min(start + this.CHUNK_SIZE, file.size)
      const form = this.uploadForm(options, file.slice(start, end, file.type), file.name, {
        chunkStart: String(start),
        chunkEnd: String(end - 1),
        fileSize: String(file.size),
        ...chunkToken ? { chunkToken } : {}
      })

      const data = await this.send(form, (progress) => onProgress((start + progress * (end - start)) / file.size), signal)
      if (end === file.size) return this.uploadedFile(data)
      chunkToken = data.chunkToken
    }
  }

  // The API streams the file as it arrives, so every other field has to come before it
  private uploadForm(options: UploadOptions, file: Blob, name: string, fields: Record<string, string> = {}) {
    const form = new FormData()
    if (options.expiresIn) form.append("expiresIn", options.expiresIn)
    if (options.maxViews) form.append("maxViews", options.maxViews)
    if (options.password) form.append("password", options.password)
    for (const [ key, value ] of Object.entries(fields)) form.append(key, value)
    form.append("file", file, name)
    return form
  }

  private uploadedFile(data: UploadResponse) {
    const uploaded = data.files?.[0]
    if (! uploaded) throw new NoammApiError(200, "Upload failed: the response had no file.", data)
    return uploaded
  }

  // XHR instead of fetch because fetch can't report upload progress
  private send(form: FormData, onProgress: (progress: number) => void, signal: AbortSignal) {
    return new Promise<UploadResponse>((resolve, reject) => {
      if (signal.aborted) return reject(new NoammApiError(0, "Upload cancelled.", null))

      const request = new XMLHttpRequest()
      request.open("POST", `${ this.baseURL }/upload`)
      request.responseType = "json"
      request.withCredentials = true

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total)
      }

      request.onload = () => {
        const data = request.response as UploadResponse | null
        if (request.status >= 200 && request.status < 300 && data) return resolve(data)
        if (request.status === 413) return reject(new NoammApiError(413, "File is too large.", data))
        reject(new NoammApiError(request.status, data?.error ?? `Upload failed (HTTP ${ request.status }).`, data))
      }

      request.onerror = () => reject(new NoammApiError(0, "Network error while uploading.", null))
      request.onabort = () => reject(new NoammApiError(0, "Upload cancelled.", null))
      signal.addEventListener("abort", () => request.abort(), { once: true })

      request.send(form)
    })
  }

  async listFiles() {
    return (await this.request<FilesResponse>("/upload/files", { method: "GET" })).files ?? []
  }

  async deleteFile(id: string) {
    await this.request(`/upload/files/${ encodeURIComponent(id) }`, { method: "DELETE" })
  }

  private session(init: RequestInit) {
    return this.request<SessionResponse>("/upload/session", init)
  }

  private async request<T extends { error?: string }>(path: string, init: RequestInit) {
    const response = await fetch(`${ this.baseURL }${ path }`, { ...init, credentials: "include" })
    const data = await response.json().catch(() => null) as T | null
    if (! response.ok) throw new NoammApiError(response.status, data?.error ?? `HTTP ${ response.status }`, data)
    return data ?? {} as T
  }
}

export default new FileHostApi()
