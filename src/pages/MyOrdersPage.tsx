import { useCallback, useEffect, useState } from 'react'
import type { FulfillmentStatus, Sale } from '../types'
import { confirmOrderDelivery, fetchMyOrders } from '../api'
import { getUserFacingApiError } from '../api/client'
import { Icon } from '../components/ui/Icon'
import { PageHelpCard } from '../components/ui/PageHelpCard'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Toast } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { notifyDataMutation } from '../utils/dataSync'
import { formatCOP, formatDate } from '../utils/format'

const timelineSteps: { key: FulfillmentStatus; label: string; icon: string }[] = [
  { key: 'preparing', label: 'Preparando pedido', icon: 'inventory_2' },
  { key: 'shipped', label: 'Enviado', icon: 'local_shipping' },
  { key: 'delivered', label: 'Entregado', icon: 'check_circle' },
]

const statusFilterOptions: { value: 'all' | FulfillmentStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
]

function stepIndex(status: FulfillmentStatus) {
  return timelineSteps.findIndex((s) => s.key === status)
}

function OrderTimeline({ status }: { status: FulfillmentStatus }) {
  const current = stepIndex(status)

  return (
    <ol className="flex flex-col gap-sm sm:flex-row sm:items-center sm:gap-md">
      {timelineSteps.map((step, index) => {
        const done = index <= current
        const active = index === current
        return (
          <li key={step.key} className="flex items-center gap-sm">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-outline-variant bg-surface-container text-outline'
              }`}
            >
              <Icon name={step.icon} size={18} />
            </div>
            <span
              className={`text-body-sm ${active ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}
            >
              {step.label}
            </span>
            {index < timelineSteps.length - 1 && (
              <span className="hidden h-px w-8 bg-outline-variant sm:block" aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function MyOrdersPage() {
  const { toastMessage, showToast, dismissToast } = useToast()
  const [orders, setOrders] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | FulfillmentStatus>('all')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    const result = await fetchMyOrders({
      pageSize: 50,
      fulfillmentStatus: statusFilter === 'all' ? undefined : statusFilter,
    })
    setOrders(result.items)
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await fetchMyOrders({
          pageSize: 50,
          fulfillmentStatus: statusFilter === 'all' ? undefined : statusFilter,
        })
        if (!cancelled) setOrders(result.items)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [statusFilter])

  useRealtimeRefresh(loadOrders, [loadOrders], { scope: ['orders', 'notifications'] })

  const handleConfirmDelivery = async (sale: Sale) => {
    setConfirmingId(sale.id)
    try {
      await confirmOrderDelivery(sale.id)
      notifyDataMutation('orders')
      notifyDataMutation('dashboard')
      notifyDataMutation('notifications')
      await loadOrders()
      showToast('¡Gracias! Confirmaste la recepción de tu pedido.')
    } catch (err) {
      showToast(getUserFacingApiError(err, 'No se pudo confirmar la entrega.'))
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando tus pedidos…
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-gutter">
      <Toast message={toastMessage} onDismiss={dismissToast} />

      <div className="rounded-xl border border-outline-variant bg-surface p-md shadow-sm md:p-gutter">
        <h3 className="text-headline-sm font-bold text-on-background md:font-display-lg md:text-display-lg">
          Mis pedidos
        </h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Rastrea el estado de tus compras y confirma cuando recibas el pedido.
        </p>
        <div className="mt-md max-w-xs">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | FulfillmentStatus)}
            className="w-full rounded-lg border border-outline bg-surface-container-lowest py-2.5 pl-3 text-body-md"
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <PageHelpCard
        storageKey="my-orders"
        icon="local_shipping"
        title="¿Cómo rastrear mi pedido?"
        intro="Cada compra pasa por tres etapas. Puedes ver el avance en la línea de tiempo de cada pedido."
        steps={[
          <>
            <strong>Preparando</strong> — estamos armando tu pedido en almacén.
          </>,
          <>
            <strong>Enviado</strong> — el pedido salió hacia tu dirección.
          </>,
          <>
            Cuando lo recibas, pulsa <strong>Confirmar que recibí el pedido</strong> para cerrar el envío.
          </>,
        ]}
        tip="Si el estado es Enviado y aún no llega, espera un momento; el botón de confirmación aparece cuando el pedido está en camino."
      />

      {orders.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-xl text-center">
          <Icon name="shopping_bag" size={40} className="mx-auto text-on-surface-variant" />
          <p className="mt-md text-body-md text-on-surface-variant">
            Aún no tienes pedidos. Realiza una compra desde el chatbot.
          </p>
        </div>
      ) : (
        <div className="space-y-md">
          {orders.map((order) => {
            const fulfillment = order.fulfillmentStatus ?? 'preparing'
            return (
              <article
                key={order.id}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-md shadow-sm md:p-gutter"
              >
                <div className="flex flex-wrap items-start justify-between gap-md">
                  <div>
                    <p className="font-mono-sm font-bold text-primary">
                      {order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">{formatDate(order.date)}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge variant={fulfillment} />
                    <p className="mt-1 font-body-md font-bold text-on-surface">{formatCOP(order.total)}</p>
                  </div>
                </div>

                <div className="mt-md rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-md">
                  <OrderTimeline status={fulfillment} />
                </div>

                {fulfillment === 'shipped' && (
                  <button
                    type="button"
                    disabled={confirmingId === order.id}
                    onClick={() => void handleConfirmDelivery(order)}
                    className="mt-md flex w-full items-center justify-center gap-sm rounded-lg bg-primary py-md font-label-md text-label-md text-on-primary hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-xl"
                  >
                    <Icon name="verified" size={18} />
                    Confirmar que recibí el pedido
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
