const STORAGE_VERSION = 1
const PREFIX = 'elplonsazo-persist:'

interface PersistedEntry<T> {
  version: number
  data: T
  savedAt: number
}

export const PERSIST_KEYS = {
  productCategories: 'product-categories',
  productStats: 'product-stats',
} as const

export const PERSIST_TTL_MS = {
  productCategories: 24 * 60 * 60 * 1000,
  productStats: 60_000,
} as const

export function readPersisted<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null

    const entry = JSON.parse(raw) as PersistedEntry<T>
    if (entry.version !== STORAGE_VERSION) return null
    if (Date.now() - entry.savedAt > ttlMs) return null

    return entry.data
  } catch {
    return null
  }
}

export function writePersisted<T>(key: string, data: T): void {
  try {
    const entry: PersistedEntry<T> = {
      version: STORAGE_VERSION,
      data,
      savedAt: Date.now(),
    }
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // Ignore quota or private-mode errors.
  }
}

export function invalidatePersisted(key: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${key}`)
  } catch {
    // Ignore storage errors.
  }
}

export function invalidateProductPersisted(): void {
  invalidatePersisted(PERSIST_KEYS.productCategories)
  invalidatePersisted(PERSIST_KEYS.productStats)
}
