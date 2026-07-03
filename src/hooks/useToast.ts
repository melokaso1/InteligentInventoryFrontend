import { useCallback, useEffect, useRef, useState } from 'react'

const TOAST_DURATION_MS = 4000

export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const dismissToast = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setToastMessage(null)
  }, [])

  const showToast = useCallback(
    (message: string) => {
      dismissToast()
      setToastMessage(message)
      timeoutRef.current = window.setTimeout(() => {
        setToastMessage(null)
        timeoutRef.current = null
      }, TOAST_DURATION_MS)
    },
    [dismissToast],
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { toastMessage, showToast, dismissToast }
}
