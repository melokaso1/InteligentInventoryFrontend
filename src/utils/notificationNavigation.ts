import type { AppNotification } from '../types'

export function getNotificationTargetPath(
  notification: AppNotification,
  admin: boolean,
): string | null {
  if (!notification.saleId) return null

  if (admin) {
    if (notification.type === 'order_delivered') {
      return `/dispatch?tab=delivered&saleId=${notification.saleId}`
    }
    return `/invoices?saleId=${notification.saleId}`
  }

  if (notification.type === 'order_shipped' || notification.type === 'order_delivered') {
    return '/my-orders'
  }

  return '/my-orders'
}
