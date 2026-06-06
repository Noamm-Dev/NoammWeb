import { NoammApiError } from './lib/NoammApi.ts'

export type JsonRecord = Record<string, unknown>

export const isJsonRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && ! Array.isArray(value)

export const getErrorMessage = (error: unknown) => {
  if (error instanceof NoammApiError) return error.message
  if (error instanceof Error && error.message.trim().length > 0) return error.message
  return "An unexpected error occurred."
}

export const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${ minutes }:${ String(seconds).padStart(2, "0") }`
}