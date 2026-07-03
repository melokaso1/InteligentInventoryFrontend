import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { Sale } from '../../types'
import { formatDate } from '../../utils/format'

export interface PendingDispatchBucket {
  totalCount: number
  items: Sale[]
}

interface PendingDispatchSectionProps {
  preparing: PendingDispatchBucket
  shipped: PendingDispatchBucket
}

function OrderRow({ order, tab }: { order: Sale; tab: 'preparing' | 'shipped' }) {
  const orderLabel = order.orderNumber ?? order.id.slice(0, 8).toUpperCase()
  const dateLabel = formatDate(
    tab === 'shipped' ? (order.shippedAt ?? order.date) : (order.preparingSince ?? order.date),
  )

  return (
    <Link
      to={`/dispatch?tab=${tab}`}
      className="flex items-center gap-md rounded-lg px-sm py-sm transition-colors hover:bg-surface-container"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono-sm font-bold text-primary">{orderLabel}</p>
        <p className="truncate text-body-sm text-on-surface">{order.customer}</p>
      </div>
      <p className="shrink-0 text-body-sm text-on-surface-variant">{dateLabel}</p>
      <Icon name="chevron_right" size={18} className="shrink-0 text-on-surface-variant" />
    </Link>
  )
}

interface DispatchCardProps {
  title: string
  description: string
  icon: string
  iconClass: string
  tab: 'preparing' | 'shipped'
  bucket: PendingDispatchBucket
  emptyMessage: string
}

function DispatchCard({
  title,
  description,
  icon,
  iconClass,
  tab,
  bucket,
  emptyMessage,
}: DispatchCardProps) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex items-start gap-md border-b border-outline-variant bg-surface-container-low px-lg py-md">
        <div className={`rounded-lg p-sm ${iconClass}`}>
          <Icon name={icon} size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-sm">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
            <span
              className={`rounded-full px-sm py-0.5 font-label-md text-xs ${
                bucket.totalCount > 0
                  ? 'bg-warning-container text-on-warning-container'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {bucket.totalCount}
            </span>
          </div>
          <p className="mt-xs text-body-sm text-on-surface-variant">{description}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-md">
        {bucket.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-lg text-center">
            <Icon name="inbox" size={32} className="text-on-surface-variant" />
            <p className="mt-sm text-body-sm text-on-surface-variant">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/50">
            {bucket.items.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} tab={tab} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-md border-t border-outline-variant/50 pt-md text-right">
          <Link
            to={`/dispatch?tab=${tab}`}
            className="inline-flex items-center gap-xs font-label-md text-label-md text-primary hover:underline"
          >
            Ver todos
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function PendingDispatchSection({ preparing, shipped }: PendingDispatchSectionProps) {
  return (
    <section className="grid min-w-0 w-full max-w-full grid-cols-1 gap-lg lg:grid-cols-2">
      <DispatchCard
        title="Pedidos pendientes por enviar"
        description="Pagados y en preparación — marcar como enviado en Despacho"
        icon="inventory"
        iconClass="bg-tertiary-container text-on-tertiary-container"
        tab="preparing"
        bucket={preparing}
        emptyMessage="No hay pedidos pendientes"
      />
      <DispatchCard
        title="Pedidos pendientes por confirmar recibido"
        description="Enviados — esperando confirmación del cliente"
        icon="mark_email_read"
        iconClass="bg-primary/15 text-primary"
        tab="shipped"
        bucket={shipped}
        emptyMessage="No hay pedidos pendientes"
      />
    </section>
  )
}
