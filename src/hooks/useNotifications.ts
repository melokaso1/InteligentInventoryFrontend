import { useCallback, useEffect, useState } from 'react'
import { fetchNotifications, markNotificationRead, clearAllNotifications } from '../api'
import { getUserFacingApiError } from '../api/client'
import type { AppNotification } from '../types'
import { useRealtimeRefresh } from './useRealtimeRefresh'
import { notifyDataMutation } from '../utils/dataSync'

export function useNotifications(enabled = true) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications()
      setUnreadCount(result.unreadCount)
      setItems(result.items)
    } catch (err) {
      setError(getUserFacingApiError(err, 'No se pudieron cargar las notificaciones.'))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) void loadNotifications()
  }, [enabled, loadNotifications])

  useRealtimeRefresh(loadNotifications, [loadNotifications], {
    scope: ['notifications', 'orders'],
    intervalMs: 15_000,
  })

  const markRead = useCallback(
    async (notification: AppNotification) => {
      if (notification.isRead) return

      try {
        await markNotificationRead(notification.id)
        notifyDataMutation('notifications')
        void loadNotifications()
      } catch {
        // Keep navigation even if mark-read fails
      }
    },
    [loadNotifications],
  )

  const clearAll = useCallback(async () => {
    if (items.length === 0 || clearing) return

    setClearing(true)
    setError(null)
    try {
      await clearAllNotifications()
      notifyDataMutation('notifications')
      setItems([])
      setUnreadCount(0)
    } catch (err) {
      setError(getUserFacingApiError(err, 'No se pudieron borrar las notificaciones.'))
    } finally {
      setClearing(false)
    }
  }, [items.length, clearing])

  return {
    unreadCount,
    items,
    loading,
    clearing,
    error,
    loadNotifications,
    markRead,
    clearAll,
  }
}
