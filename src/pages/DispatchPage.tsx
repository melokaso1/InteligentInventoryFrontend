import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { FulfillmentStatus, Sale } from '../types'

import { fetchDispatchOrders, updateDispatchStatus } from '../api'

import { getUserFacingApiError } from '../api/client'

import { DataTable } from '../components/ui/DataTable'

import { Icon } from '../components/ui/Icon'

import { StatusBadge } from '../components/ui/StatusBadge'

import { Toast } from '../components/ui/Toast'

import { useToast } from '../hooks/useToast'

import { formatSecondsSince, useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

import { notifyDataMutation } from '../utils/dataSync'

import { formatCOP, formatDate, formatGroupDate, getColombiaDateKey } from '../utils/format'

const statusFilterTabs: { value: 'all' | FulfillmentStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
]

function parseDispatchTab(value: string | null): 'all' | FulfillmentStatus {
  if (value && statusFilterTabs.some((tab) => tab.value === value)) {
    return value as 'all' | FulfillmentStatus
  }
  return 'preparing'
}

function getDispatchGroupTimestamp(order: Sale): string {
  const status = order.fulfillmentStatus ?? 'preparing'
  if (status === 'shipped') return order.shippedAt ?? order.date
  if (status === 'delivered') return order.deliveredAt ?? order.date
  return order.preparingSince ?? order.date
}

function groupOrdersByDate(orders: Sale[]) {
  const groups = new Map<string, Sale[]>()

  for (const order of orders) {
    const key = getColombiaDateKey(getDispatchGroupTimestamp(order))
    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(order)
    } else {
      groups.set(key, [order])
    }
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, items]) => ({
      key,
      label: formatGroupDate(getDispatchGroupTimestamp(items[0])),
      items: [...items].sort(
        (left, right) =>
          new Date(getDispatchGroupTimestamp(right)).getTime() -
          new Date(getDispatchGroupTimestamp(left)).getTime(),
      ),
    }))
}

export function DispatchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toastMessage, showToast, dismissToast } = useToast()
  const [orders, setOrders] = useState<Sale[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [preparingCount, setPreparingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | FulfillmentStatus>(() =>
    parseDispatchTab(searchParams.get('tab')),
  )
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const tabFromUrl = parseDispatchTab(searchParams.get('tab'))
    setStatusFilter((current) => (current === tabFromUrl ? current : tabFromUrl))
  }, [searchParams])

  const loadOrders = useCallback(async () => {
    const [result, preparingResult] = await Promise.all([
      fetchDispatchOrders({
        pageSize: 50,
        fulfillmentStatus: statusFilter === 'all' ? undefined : statusFilter,
      }),
      fetchDispatchOrders({ pageSize: 1, fulfillmentStatus: 'preparing' }),
    ])
    setOrders(result.items)
    setTotalCount(result.totalCount)
    setPreparingCount(preparingResult.totalCount)
  }, [statusFilter])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (isInitialLoad.current) setLoading(true)
      try {
        if (!cancelled) await loadOrders()
      } finally {
        if (!cancelled && isInitialLoad.current) {
          isInitialLoad.current = false
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [loadOrders])

  const { secondsSinceUpdate } = useRealtimeRefresh(loadOrders, [loadOrders], {
    intervalMs: 8_000,
    scope: ['orders', 'notifications'],
  })

  const orderGroups = useMemo(() => groupOrdersByDate(orders), [orders])

  const handleStatusFilterChange = (value: 'all' | FulfillmentStatus) => {
    setStatusFilter(value)
    if (value === 'preparing') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: value }, { replace: true })
    }
  }

  const handleStatusUpdate = async (sale: Sale, nextStatus: 'shipped' | 'delivered') => {
    setUpdatingId(sale.id)
    try {
      await updateDispatchStatus(sale.id, nextStatus)
      notifyDataMutation('orders')
      notifyDataMutation('dashboard')
      notifyDataMutation('notifications')
      await loadOrders()
      showToast(
        nextStatus === 'shipped'
          ? `Pedido ${sale.orderNumber ?? sale.id.slice(0, 8)} marcado como enviado.`
          : `Pedido ${sale.orderNumber ?? sale.id.slice(0, 8)} marcado como entregado.`,
      )
    } catch (err) {
      showToast(getUserFacingApiError(err, 'No se pudo actualizar el estado del pedido.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const tableColumns = useMemo(
    () => [
      {
        key: 'order',
        header: 'Pedido',
        render: (row: Sale) => (
          <div>
            <p className="font-mono-sm font-bold text-primary">
              {row.orderNumber ?? row.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-body-sm text-on-surface-variant">{formatDate(row.date)}</p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Cliente',
        render: (row: Sale) => (
          <div>
            <p className="font-body-md text-on-surface">{row.customer}</p>
            <p className="text-body-sm text-on-surface-variant">{row.email}</p>
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        render: (row: Sale) => (
          <span className="font-body-md font-bold text-on-surface">{formatCOP(row.total)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Estado despacho',
        render: (row: Sale) => <StatusBadge variant={row.fulfillmentStatus ?? 'preparing'} />,
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row: Sale) => (
          <div className="flex flex-wrap gap-sm">
            {row.fulfillmentStatus === 'preparing' && (
              <button
                type="button"
                disabled={updatingId === row.id}
                onClick={() => void handleStatusUpdate(row, 'shipped')}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-md py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                <Icon name="local_shipping" size={16} />
                Marcar como enviado
              </button>
            )}
            {row.fulfillmentStatus === 'shipped' && (
              <button
                type="button"
                disabled={updatingId === row.id}
                onClick={() => void handleStatusUpdate(row, 'delivered')}
                className="inline-flex items-center gap-1 rounded-lg border border-primary px-md py-2 font-label-md text-label-md text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <Icon name="check_circle" size={16} />
                Marcar como entregado
              </button>
            )}
            {row.fulfillmentStatus === 'delivered' && (
              <span className="inline-flex items-center gap-1 px-md py-2 text-body-sm text-on-surface-variant">
                <Icon name="done_all" size={16} className="text-primary" />
                Completado
              </span>
            )}
          </div>
        ),
      },
    ],
    [updatingId],
  )

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando despacho…
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-gutter">
      <Toast message={toastMessage} onDismiss={dismissToast} />

      <div className="rounded-xl border border-outline-variant bg-surface p-md shadow-sm md:p-gutter">
        <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-sm">
              <div className="rounded-lg bg-primary/10 p-sm text-primary">
                <Icon name="local_shipping" size={28} />
              </div>
              <h3 className="text-headline-sm font-bold text-on-background md:font-display-lg md:text-display-lg">
                Despacho
              </h3>
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Gestiona el envío de pedidos con factura pagada. Al confirmar el pago, el pedido pasa a
              <strong> Preparando</strong> automáticamente.
            </p>
            <p className="mt-1 text-label-md text-label-md text-on-surface-variant">
              {formatSecondsSince(secondsSinceUpdate)}
            </p>
          </div>
          {preparingCount > 0 ? (
            <div className="shrink-0 rounded-lg border border-warning-container bg-warning-container/30 px-md py-sm text-center">
              <p className="font-display-lg text-display-lg text-on-warning-container">{preparingCount}</p>
              <p className="text-label-md text-on-surface-variant">pendientes de envío</p>
            </div>
          ) : null}
        </div>

        <div className="mt-md rounded-lg border border-primary/20 bg-primary/5 px-md py-sm">
          <p className="font-label-md text-label-md text-primary">¿Cómo despachar un pedido?</p>
          <ol className="mt-1 list-inside list-decimal text-body-sm text-on-surface-variant">
            <li>Localiza el pedido en estado <strong>Preparando</strong>.</li>
            <li>Pulsa <strong>Marcar como enviado</strong> cuando salga del almacén.</li>
            <li>Opcional: marca <strong>Entregado</strong> al confirmar recepción (el cliente también puede confirmar).</li>
          </ol>
        </div>

        <div className="mt-md">
          <label className="mb-1 block font-label-md text-label-md text-on-surface-variant">
            Filtrar por estado
          </label>
          <div className="flex overflow-hidden rounded-lg border border-outline bg-surface-container-lowest">
            {statusFilterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusFilterChange(tab.value)}
                className={`flex min-w-0 flex-1 items-center justify-center px-3 py-2.5 text-body-md transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-primary font-semibold text-on-primary'
                    : 'text-on-surface-variant hover:bg-primary/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-xl text-center">
          <Icon name="local_shipping" size={40} className="mx-auto text-on-surface-variant" />
          <p className="mt-md text-body-md text-on-surface-variant">
            {statusFilter === 'preparing'
              ? 'No hay pedidos pagados pendientes de envío. Al pagar una factura, el pedido pasa automáticamente a Preparando.'
              : statusFilter === 'all'
                ? 'No hay pedidos pagados en despacho. Los pedidos aparecen aquí después de pagar la factura.'
                : 'No hay pedidos pagados con este filtro.'}
          </p>
        </div>
      ) : (
        <div className="min-w-0 space-y-md">
          <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface px-lg py-md shadow-sm">
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Pedidos para despacho</h4>
            <span className="text-body-sm text-on-surface-variant">
              {totalCount} pedido{totalCount === 1 ? '' : 's'}
            </span>
          </div>

          {orderGroups.map((group) => (
            <section
              key={group.key}
              className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm"
            >
              <div className="border-b border-outline-variant bg-surface-container-low px-lg py-sm">
                <h5 className="font-label-md text-label-md text-on-surface-variant">{group.label}</h5>
              </div>
              <DataTable columns={tableColumns} data={group.items} getRowId={(row) => row.id} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
