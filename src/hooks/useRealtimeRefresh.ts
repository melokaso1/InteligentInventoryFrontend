import { useCallback, useEffect, useRef, useState } from 'react'
import {
  matchesMutationScope,
  subscribeDataMutations,
  type DataMutationScope,
} from '../utils/dataSync'

export const REALTIME_REFRESH_INTERVAL_MS = 30_000

export interface UseRealtimeRefreshOptions {
  intervalMs?: number
  enabled?: boolean
  scope?: DataMutationScope | DataMutationScope[]
  /** When false, skip polling until the tab is visible (default true). */
  onlyWhenVisible?: boolean
}

export function formatSecondsSince(seconds: number | null): string {
  if (seconds === null) return 'Tiempo real'
  if (seconds < 5) return 'Actualizado ahora'
  if (seconds < 60) return `Actualizado hace ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `Actualizado hace ${minutes}m`
}

export function useRealtimeRefresh(
  callback: () => void | Promise<void>,
  deps: React.DependencyList = [],
  options?: UseRealtimeRefreshOptions,
): {
  lastUpdatedAt: Date | null
  secondsSinceUpdate: number | null
  refresh: () => void
} {
  const intervalMs = options?.intervalMs ?? REALTIME_REFRESH_INTERVAL_MS
  const enabled = options?.enabled ?? true
  const listenScopes = options?.scope
  const onlyWhenVisible = options?.onlyWhenVisible ?? true

  const listenScopesRef = useRef(listenScopes)
  listenScopesRef.current = listenScopes

  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [, setTick] = useState(0)

  const runRefresh = useCallback(() => {
    if (onlyWhenVisible && document.visibilityState !== 'visible') return

    void Promise.resolve(callbackRef.current()).then(() => {
      setLastUpdatedAt(new Date())
    })
  }, [onlyWhenVisible])

  useEffect(() => {
    if (!enabled) return

    const interval = window.setInterval(() => {
      if (onlyWhenVisible && document.visibilityState !== 'visible') return
      runRefresh()
    }, intervalMs)

    let focusDebounce: number | undefined

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(focusDebounce)
      focusDebounce = window.setTimeout(runRefresh, 1_500)
    }

    const onFocus = () => {
      window.clearTimeout(focusDebounce)
      focusDebounce = window.setTimeout(runRefresh, 1_500)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(focusDebounce)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, intervalMs, runRefresh, onlyWhenVisible, ...deps])

  useEffect(() => {
    if (!enabled) return

    return subscribeDataMutations((mutationScope) => {
      if (matchesMutationScope(mutationScope, listenScopesRef.current)) {
        runRefresh()
      }
    })
  }, [enabled, runRefresh])

  useEffect(() => {
    const tickInterval = window.setInterval(() => {
      setTick((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(tickInterval)
  }, [])

  const secondsSinceUpdate =
    lastUpdatedAt === null ? null : Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000)

  return { lastUpdatedAt, secondsSinceUpdate, refresh: runRefresh }
}
