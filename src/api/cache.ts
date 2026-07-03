export const DEFAULT_API_CACHE_TTL_MS = 45_000

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export function buildCacheKey(path: string): string {
  return path
}

export function readCache<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined
}

export function isCacheFresh(key: string, ttlMs = DEFAULT_API_CACHE_TTL_MS): boolean {
  const entry = store.get(key)
  if (!entry) return false
  return Date.now() - entry.fetchedAt <= ttlMs
}

export function writeCache<T>(key: string, data: T): void {
  store.set(key, { data, fetchedAt: Date.now() })
}

export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }

  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

const MUTATION_PREFIXES: Record<string, string[]> = {
  all: [],
  dashboard: ['/api/dashboard'],
  products: ['/api/products'],
  inventory: ['/api/inventory', '/api/dashboard'],
  sales: ['/api/sales', '/api/dashboard'],
  invoices: ['/api/invoices', '/api/dashboard'],
  orders: ['/api/dispatch', '/api/my/orders', '/api/dashboard'],
  notifications: ['/api/notifications'],
}

export function invalidateApiCacheForMutation(scope: string): void {
  if (scope === 'all') {
    store.clear()
    return
  }

  const prefixes = MUTATION_PREFIXES[scope]
  if (!prefixes) return
  for (const prefix of prefixes) {
    invalidateApiCache(prefix)
  }
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_API_CACHE_TTL_MS,
): Promise<T> {
  if (isCacheFresh(key, ttlMs)) {
    return readCache<T>(key) as T
  }

  const stale = readCache<T>(key)
  if (stale !== undefined) {
    void revalidate(key, fetcher)
    return stale
  }

  return revalidate(key, fetcher)
}

async function revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return pending

  const promise = fetcher()
    .then((data) => {
      writeCache(key, data)
      return data
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
