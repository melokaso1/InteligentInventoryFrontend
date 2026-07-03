const API_BASE = import.meta.env.VITE_API_URL ?? ''

import { getToken } from '../hooks/useAuth'
import { normalizeJson } from './normalize'

const FALLBACK_ERROR_MESSAGE = 'Ocurrió un error inesperado.'

function looksLikeStackTrace(text: string): boolean {
  return /D:\\/i.test(text) || /\bat\s+\S/.test(text)
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart()
  return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<')
}

export function sanitizeApiErrorMessage(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return FALLBACK_ERROR_MESSAGE

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown; detail?: unknown }
    const fromJson = parsed.error ?? parsed.message
    if (typeof fromJson === 'string') {
      const message = fromJson.trim()
      if (message && !looksLikeStackTrace(message) && !looksLikeHtml(message)) {
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

  return trimmed
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
  }

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('ngrok-free.dev')) {
    headers['ngrok-skip-browser-warning'] = 'true'
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (!response.ok) {
    const message = (await response.text()) || response.statusText
    throw new ApiError(message, response.status)
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
