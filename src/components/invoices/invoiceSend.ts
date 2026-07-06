import type { Invoice } from '../../types'

/** Invoice linked to an in-store sale or created manually without online checkout. */
export function isManualInvoice(invoice: Invoice): boolean {
  return invoice.source === 'manual'
}

export function canSendInvoice(invoice: Invoice): boolean {
  return !isManualInvoice(invoice)
}

export const INVOICE_SEND_UNAVAILABLE_MESSAGE =
  'Venta en mostrador: el cliente ya recibió la factura en tienda. No requiere envío por correo.'
