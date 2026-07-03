import { useCallback, useEffect, useState } from 'react'
import type { Invoice } from '../types'
import { fetchMyInvoices, payMyInvoice } from '../api'
import { canPayInvoice, PayInvoiceModal, type PaymentMethod } from '../components/invoices/PayInvoiceModal'
import { Icon } from '../components/ui/Icon'
import { PageHelpCard } from '../components/ui/PageHelpCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Toast } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { formatCOP, formatDate } from '../utils/format'
import { notifyDataMutation } from '../utils/dataSync'

export function ClientInvoicesPage() {
  const { toastMessage, showToast, dismissToast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const loadInvoices = useCallback(async () => {
    const result = await fetchMyInvoices({ pageSize: 50 })
    setInvoices(result.items)
    setTotalCount(result.totalCount)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await fetchMyInvoices({ pageSize: 50 })
        if (!cancelled) {
          setInvoices(result.items)
          setTotalCount(result.totalCount)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const openPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPayModalOpen(true)
  }

  const closePayModal = () => {
    setPayModalOpen(false)
    setSelectedInvoice(null)
  }

  const handlePay = async (paymentMethod: PaymentMethod) => {
    if (!selectedInvoice) return

    await payMyInvoice(selectedInvoice.id, paymentMethod)
    await loadInvoices()
    notifyDataMutation('notifications')
    notifyDataMutation('orders')
    closePayModal()
    showToast('Pago registrado. La factura ahora aparece como pagada.')
  }

  const pendingCount = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue').length

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando tus facturas…
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-gutter">
      <Toast message={toastMessage} onDismiss={dismissToast} />

      <div className="rounded-xl border border-outline-variant bg-surface p-md shadow-sm md:p-gutter">
        <h3 className="text-headline-sm font-bold text-on-background md:font-display-lg md:text-display-lg">
          Mis facturas
        </h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Consulta y paga las facturas generadas por tus compras en El Plonsazo.
        </p>
        {pendingCount > 0 ? (
          <p className="mt-md rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-md py-sm text-body-sm text-on-surface">
            Tienes {pendingCount} factura{pendingCount === 1 ? '' : 's'} pendiente{pendingCount === 1 ? '' : 's'} de pago.
          </p>
        ) : null}
      </div>

      <PageHelpCard
        storageKey="my-invoices"
        icon="payments"
        title="¿Cómo pagar una factura?"
        intro="Las facturas se generan al confirmar una compra en el chatbot."
        steps={[
          <>
            Localiza la factura con estado <strong>Pendiente</strong> o <strong>Vencida</strong>.
          </>,
          <>
            Pulsa <strong>Pagar factura</strong> en la fila o tarjeta correspondiente.
          </>,
          <>
            Elige el método de pago en el cuadro de diálogo y confirma para registrar el pago.
          </>,
        ]}
        tip="Tras pagar, el estado cambiará a Pagada. Si no ves el botón, la factura ya está saldada o no requiere acción."
      />

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-xl text-center">
          <Icon name="receipt_long" size={40} className="mx-auto text-on-surface-variant" />
          <p className="mt-md text-body-md text-on-surface-variant">
            Aún no tienes facturas. Realiza una compra desde el chatbot para generar una.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="divide-y divide-outline-variant/40 md:hidden">
            {invoices.map((row) => (
              <article key={row.id} className="p-md">
                <div className="flex items-start justify-between gap-sm">
                  <div>
                    <p className="font-mono-sm font-bold text-primary">{row.id.slice(0, 8).toUpperCase()}</p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">Emisión: {formatDate(row.date)}</p>
                  </div>
                  <StatusBadge variant={row.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-md">
                  <p className="font-body-md font-bold text-on-surface">{formatCOP(row.total)}</p>
                  {canPayInvoice(row) ? (
                    <button
                      type="button"
                      onClick={() => openPayModal(row)}
                      className="flex items-center gap-1 rounded-lg bg-primary px-md py-2 font-label-md text-label-md text-on-primary hover:opacity-90"
                    >
                      <Icon name="payments" size={18} />
                      Pagar factura
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-surface-container">
                <tr>
                  {['Factura #', 'Emisión', 'Vencimiento', 'Total', 'Estado', 'Acciones'].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap border-b border-outline-variant px-gutter py-3 font-label-md text-label-md uppercase text-on-surface-variant"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {invoices.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-high">
                    <td className="whitespace-nowrap px-gutter py-4 font-mono-sm font-bold text-primary">
                      {row.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="whitespace-nowrap px-gutter py-4 text-on-surface-variant">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-gutter py-4 text-on-surface-variant">{formatDate(row.dueDate)}</td>
                    <td className="whitespace-nowrap px-gutter py-4 font-bold text-on-surface">{formatCOP(row.total)}</td>
                    <td className="whitespace-nowrap px-gutter py-4">
                      <StatusBadge variant={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-gutter py-4">
                      {canPayInvoice(row) ? (
                        <button
                          type="button"
                          onClick={() => openPayModal(row)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-2 font-label-md text-label-md text-on-primary hover:opacity-90"
                        >
                          <Icon name="payments" size={18} />
                          Pagar factura
                        </button>
                      ) : (
                        <span className="text-body-sm text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-outline-variant px-gutter py-3 text-body-sm text-on-surface-variant">
            Mostrando {invoices.length} de {totalCount} factura{totalCount === 1 ? '' : 's'}
          </div>
        </div>
      )}

      <PayInvoiceModal
        open={payModalOpen}
        invoice={selectedInvoice}
        onClose={closePayModal}
        onConfirm={handlePay}
      />
    </div>
  )
}
