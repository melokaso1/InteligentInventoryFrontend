const API_BASE = import.meta.env.VITE_API_URL ?? ''

import { getToken } from '../hooks/useAuth'
import { normalizeJson } from './normalize'

/** Sent on every API request so ngrok tunnels skip the browser interstitial. */
export const NGROK_SKIP_BROWSER_WARNING_HEADER = 'ngrok-skip-browser-warning'

export function shouldSendNgrokSkipHeader(): boolean {
  if (API_BASE.includes('ngrok')) return true
  if (typeof window !== 'undefined' && window.location.hostname.includes('ngrok')) return true
  return false
}

export function ngrokSkipHeaders(): Record<string, string> {
  return shouldSendNgrokSkipHeader() ? { [NGROK_SKIP_BROWSER_WARNING_HEADER]: 'true' } : {}
}

const FALLBACK_ERROR_MESSAGE = 'Ocurrió un error inesperado.'

export const API_CONNECTION_ERROR_MESSAGE =
  'No pudimos conectar con el servidor. Intenta de nuevo en unos momentos.'

export const API_INTERNAL_ERROR_MESSAGE =
  'Error interno del servidor. Intenta de nuevo más tarde.'

export const CHATBOT_UNAVAILABLE_MESSAGE =
  'El asistente no está disponible en este momento. Intenta de nuevo más tarde.'

export type ApiErrorContext = 'default' | 'chat'

function looksLikeStackTrace(text: string): boolean {
  return /D:\\/i.test(text) || /\bat\s+\S/.test(text)
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart()
  return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<')
}

function looksLikeDevMessage(text: string): boolean {
  return /dotnet\s+run|puerto\s*5151|Backend\/Api|FastAPI|LLMChatBot|python\s+run\.py|127\.0\.0\.1:5151/i.test(
    text,
  )
}

export function isInfrastructureError(status: number): boolean {
  return status === 0 || status === 502 || status === 503 || status === 504 || status >= 500
}

function mapStatusToUserMessage(status: number, context: ApiErrorContext = 'default'): string {
  if (status === 502 || status === 0 || status === 504) {
    return API_CONNECTION_ERROR_MESSAGE
  }
  if (status === 503 && context === 'chat') {
    return CHATBOT_UNAVAILABLE_MESSAGE
  }
  if (status >= 500) {
    return API_INTERNAL_ERROR_MESSAGE
  }
  return FALLBACK_ERROR_MESSAGE
}

export function isAbortError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  return (err as { name?: string }).name === 'AbortError'
}

export function logApiError(context: string, err: unknown): void {
  if (isAbortError(err)) return
  console.error(`[API] ${context}`, err)
}

export function getUserFacingApiError(
  err: unknown,
  fallback = FALLBACK_ERROR_MESSAGE,
  context: ApiErrorContext = 'default',
): string {
  if (err instanceof ApiError) {
    if (isInfrastructureError(err.status)) {
      return mapStatusToUserMessage(err.status, context)
    }
    return err.message || fallback
  }
  if (err instanceof TypeError) {
    return API_CONNECTION_ERROR_MESSAGE
  }
  return fallback
}

export function sanitizeApiErrorMessage(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return FALLBACK_ERROR_MESSAGE

  if (looksLikeDevMessage(trimmed)) {
    return API_CONNECTION_ERROR_MESSAGE
  }

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown; detail?: unknown }
    const fromJson = parsed.error ?? parsed.message
    if (typeof fromJson === 'string') {
      const message = fromJson.trim()
      if (message && !looksLikeStackTrace(message) && !looksLikeHtml(message) && !looksLikeDevMessage(message)) {
        return message
      }
      return FALLBACK_ERROR_MESSAGE
    }

    // Parsed JSON error body without a usable message — never surface raw JSON to the UI.
    return FALLBACK_ERROR_MESSAGE
  } catch {
    // Response body is not JSON.
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return FALLBACK_ERROR_MESSAGE
  }

  if (looksLikeStackTrace(trimmed) || looksLikeHtml(trimmed) || trimmed.length > 500) {
    return FALLBACK_ERROR_MESSAGE
  }

  if (looksLikeDevMessage(trimmed)) {
    return API_CONNECTION_ERROR_MESSAGE
  }

  return trimmed
}

export function buildApiError(raw: string, status: number, context: ApiErrorContext = 'default'): ApiError {
  let message = sanitizeApiErrorMessage(raw)
  if (isInfrastructureError(status)) {
    message = mapStatusToUserMessage(status, context)
  }
  return new ApiError(message, status)
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(sanitizeApiErrorMessage(message))
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...ngrokSkipHeaders(),
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
    })
  } catch (err) {
    if (isAbortError(err)) throw err
    logApiError(`fetch ${path}`, err)
    throw new ApiError(API_CONNECTION_ERROR_MESSAGE, 0)
  }

  if (!response.ok) {
    const raw = (await response.text()) || response.statusText
    logApiError(`${response.status} ${path}`, { status: response.status, body: raw })
    throw buildApiError(raw, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload: unknown = await response.json()
  return normalizeJson<T>(payload)
}

export interface PagedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
