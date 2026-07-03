import type { AppNotification } from '../types'

export function getNotificationTargetPath(
  notification: AppNotification,
  admin: boolean,
): string | null {
  if (admin) {
    if (notification.invoiceId) {
      return `/invoices?invoiceId=${notification.invoiceId}`
    }
    if (notification.saleId) {
      if (notification.type === 'order_delivered') {
        return `/dispatch?tab=delivered&saleId=${notification.saleId}`
      }
      return `/dispatch?saleId=${notification.saleId}`
    }
    return null
  }

  if (notification.saleId && (
    notification.type === 'order_preparing'
    || notification.type === 'order_shipped'
    || notification.type === 'order_delivered'
  )) {
    return '/my-orders'
  }

  return notification.saleId ? '/my-orders' : null
}
