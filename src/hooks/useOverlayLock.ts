import { useEffect, useId, useSyncExternalStore } from 'react'

const openOverlays = new Set<string>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return openOverlays.size > 0
}

function notify() {
  listeners.forEach((listener) => listener())
}

function setOverlayOpen(id: string, open: boolean) {
  const hadOpen = openOverlays.size > 0
  if (open) {
    openOverlays.add(id)
  } else {
    openOverlays.delete(id)
  }
  const hasOpen = openOverlays.size > 0
  if (hadOpen !== hasOpen) {
    document.body.classList.toggle('overlay-open', hasOpen)
  }
  notify()
}

export function useAnyOverlayOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useOverlayLock(open: boolean, id?: string) {
  const autoId = useId()
  const overlayId = id ?? autoId

  useEffect(() => {
    setOverlayOpen(overlayId, open)
    return () => setOverlayOpen(overlayId, false)
  }, [open, overlayId])
}
