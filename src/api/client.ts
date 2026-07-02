const API_BASE = import.meta.env.VITE_API_URL ?? ''

import { getToken } from '../hooks/useAuth'
import { normalizeJson } from './normalize'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
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
