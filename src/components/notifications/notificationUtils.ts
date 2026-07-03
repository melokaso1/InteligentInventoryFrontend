import type { AppNotification } from '../../types'
import { formatDate } from '../../utils/format'

export function formatNotificationTime(iso: string) {
  try {
    const date = new Date(iso)
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return formatDate(iso)
  }
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'order_preparing':
      return 'inventory_2'
    case 'order_shipped':
      return 'local_shipping'
    case 'order_delivered':
      return 'check_circle'
    default:
      return 'notifications'
  }
}

export type { AppNotification }
