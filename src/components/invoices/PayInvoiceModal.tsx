import { useState } from 'react'
import { getUserFacingApiError } from '../../api/client'
import type { Invoice } from '../../types'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { formatCOP } from '../../utils/format'

export type PaymentMethod = 'transferencia' | 'tarjeta' | 'efectivo'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'transferencia', label: 'Transferencia bancaria', icon: 'account_balance' },
  { value: 'tarjeta', label: 'Tarjeta de crédito/débito', icon: 'credit_card' },
  { value: 'efectivo', label: 'Efectivo', icon: 'payments' },
]

interface PayInvoiceModalProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onConfirm: (paymentMethod: PaymentMethod) => Promise<void>
  adminMode?: boolean
}

export function PayInvoiceModal({ open, invoice, onClose, onConfirm, adminMode = false }: PayInvoiceModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (submitting) return
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (!invoice || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(paymentMethod)
      setError(null)
    } catch (err) {
      setError(getUserFacingApiError(err, 'No se pudo registrar el pago.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={adminMode ? 'Marcar como pagada' : 'Pagar factura'}
      icon="payments"
      footer={
        <div className="flex flex-col gap-md">
          {error ? (
            <p className="text-body-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-md">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting || !invoice}
              className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Procesando…' : adminMode ? 'Confirmar pago' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      }
    >
      {invoice ? (
        <div className="space-y-md">
          <p className="text-body-sm text-on-surface-variant">
            Factura <span className="font-mono-sm font-bold text-primary">{invoice.id.slice(0, 8).toUpperCase()}</span>
            {' · '}
            Total: <span className="font-bold text-on-surface">{formatCOP(invoice.total)}</span>
          </p>
          <fieldset className="space-y-sm">
            <legend className="mb-2 text-label-md font-semibold uppercase text-on-surface-variant">
              Método de pago
            </legend>
            {PAYMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-sm rounded-lg border px-md py-sm transition-colors ${
                  paymentMethod === option.value
                    ? 'border-primary bg-primary-container/20'
                    : 'border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="accent-primary"
                />
                <Icon name={option.icon} size={20} className="text-primary" />
                <span className="text-body-md text-on-surface">{option.label}</span>
              </label>
            ))}
          </fieldset>
          <p className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-md py-sm text-body-sm text-on-surface-variant">
            {adminMode
              ? 'Confirma el método de pago recibido. La factura quedará marcada como pagada.'
              : 'Simulación de pago: al confirmar, la factura quedará marcada como pagada en el sistema.'}
          </p>
        </div>
      ) : null}
    </Modal>
  )
}

function canPayInvoice(invoice: Invoice): boolean {
  return invoice.status === 'pending' || invoice.status === 'overdue'
}

export { canPayInvoice }
