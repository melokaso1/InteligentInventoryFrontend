import { useEffect, useState } from 'react'
import type { Sale } from '../types'
import { fetchSales, fetchSaleMetrics } from '../api'
import { formatCOP } from '../utils/format'
import { DataTable } from '../components/ui/DataTable'
import { Drawer } from '../components/ui/Drawer'
import { Icon } from '../components/ui/Icon'
import { KpiCard } from '../components/ui/KpiCard'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'

const originLabels: Record<'all' | 'manual' | 'chatbot', string> = {
  all: 'Todos',
  manual: 'Manual',
  chatbot: 'Chatbot',
}

function customerInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalRevenue: 0,
    chatbotSales: 0,
    manualSales: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [originFilter, setOriginFilter] = useState<'all' | 'manual' | 'chatbot'>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [salesResult, metricsResult] = await Promise.all([
          fetchSales({
            origin: originFilter === 'all' ? undefined : originFilter,
            pageSize: 50,
          }),
          fetchSaleMetrics(),
        ])
        if (!cancelled) {
          setSales(salesResult.items)
          setMetrics(metricsResult)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [originFilter])

  const openDrawer = (sale: Sale) => {
    setSelected(sale)
    setDrawerOpen(true)
  }

  const orderCount = sales.length
  const periodTotal = metrics.totalRevenue
  const avgTicket = orderCount > 0 ? periodTotal / orderCount : 0

  if (loading && sales.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando ventas…
      </div>
    )
  }

  return (
    <>
      <div className="min-w-0 space-y-gutter">
        <div className="flex min-w-0 max-w-full flex-col gap-md overflow-hidden rounded-xl border border-outline-variant bg-surface p-md shadow-sm md:flex-row md:flex-wrap md:items-end">
            <div className="min-w-0 w-full md:min-w-[200px] md:flex-1">
              <label className="mb-1 block font-label-md text-label-md text-on-surface-variant">
                Rango de fechas
              </label>
              <Select className="w-full min-w-0 shrink rounded-lg border border-outline bg-surface-container-lowest py-2.5 pl-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary md:w-auto">
                <option>Últimos 30 días</option>
                <option>Este mes</option>
                <option>Último trimestre</option>
                <option>Rango personalizado</option>
              </Select>
            </div>
            <div className="min-w-0 w-full md:min-w-[200px] md:flex-1">
              <label className="mb-1 block font-label-md text-label-md text-on-surface-variant">
                Origen
              </label>
              <div className="flex min-h-[42px] overflow-hidden rounded-lg border border-outline bg-surface-container-lowest">
                {(['all', 'manual', 'chatbot'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOriginFilter(value)}
                    className={`flex min-w-0 flex-1 items-center justify-center px-3 py-2.5 text-body-md ${
                      originFilter === value
                        ? 'bg-primary font-semibold text-on-primary'
                        : 'text-on-surface-variant hover:bg-primary/10'
                    }`}
                  >
                    {originLabels[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 w-full md:min-w-[200px] md:flex-1">
              <label className="mb-1 block font-label-md text-label-md text-on-surface-variant">
                Estado del pedido
              </label>
              <Select className="w-full min-w-0 shrink rounded-lg border border-outline bg-surface-container-lowest py-2.5 pl-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary md:w-auto">
                <option>Todos los estados</option>
                <option>Pendiente</option>
                <option>Pagado</option>
                <option>Enviado</option>
                <option>Cancelado</option>
              </Select>
            </div>
            <PrimaryActionButton icon={false} size="compact" className="w-full font-body-md md:w-auto">
              Aplicar filtros
            </PrimaryActionButton>
        </div>

        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Ventas totales (período)"
            value={formatCOP(periodTotal)}
            change={`${metrics.totalSales} pedidos`}
            changeType="positive"
            icon="payments"
            iconBg="bg-primary-container"
            iconColor="text-on-primary-container"
          />
          <KpiCard
            label="Pedidos"
            value={orderCount.toLocaleString('es-CO')}
            change={`${originFilter === 'all' ? 'Todos' : originLabels[originFilter]}`}
            changeType="neutral"
            icon="shopping_cart"
            iconBg="bg-tertiary-container"
            iconColor="text-on-tertiary-container"
          />
          <KpiCard
            label="Ticket medio"
            value={formatCOP(avgTicket)}
            change="vs período"
            changeType="neutral"
            icon="receipt_long"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
          />
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="border-b border-outline-variant p-lg">
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Registros de ventas</h4>
          </div>
          <DataTable
            data={sales}
            getRowId={(row) => row.id}
            onRowClick={openDrawer}
            columns={[
              {
                key: 'id',
                header: 'ID de pedido',
                nowrap: true,
                render: (row) => (
                  <span className="font-mono text-xs font-bold text-primary">#{shortOrderId(row.id)}</span>
                ),
              },
              {
                key: 'customer',
                header: 'Nombre del cliente',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-container text-xs font-bold text-tertiary">
                      {customerInitials(row.customer)}
                    </div>
                    <span className="font-body-md font-semibold">{row.customer}</span>
                  </div>
                ),
              },
              {
                key: 'origin',
                header: 'Origen',
                hideOnTablet: true,
                render: (row) => (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold uppercase ${
                      row.origin === 'chatbot'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-tertiary-container text-on-tertiary-container'
                    }`}
                  >
                    <Icon name={row.origin === 'chatbot' ? 'smart_toy' : 'edit_note'} size={14} />
                    {originLabels[row.origin]}
                  </span>
                ),
              },
              { key: 'date', header: 'Fecha del pedido', hideOnTablet: true, render: (row) => row.date },
              {
                key: 'total',
                header: 'Importe total',
                className: 'text-right',
                render: (row) => <span className="font-semibold">{formatCOP(row.total)}</span>,
              },
              {
                key: 'status',
                header: 'Estado',
                render: (row) => <StatusBadge variant={row.status} />,
              },
              {
                key: 'actions',
                header: 'Acciones',
                className: 'text-right',
                render: () => (
                  <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" className="rounded-lg p-2 text-primary hover:bg-primary/10">
                      <Icon name="receipt_long" />
                    </button>
                    <button type="button" className="rounded-lg p-2 text-primary hover:bg-primary/10">
                      <Icon name="settings_suggest" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalles de la venta"
        subtitle={selected ? shortOrderId(selected.id) : undefined}
        width="500px"
        footer={
          <button
            type="button"
            className="w-full rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary"
          >
            Generar factura
          </button>
        }
      >
        {selected && (
          <div className="space-y-lg">
            <div className="grid grid-cols-2 gap-md">
              <div>
                <p className="text-label-md uppercase text-on-surface-variant">Cliente</p>
                <p className="font-semibold">{selected.customer}</p>
                <p className="text-body-sm text-on-surface-variant">{selected.email}</p>
              </div>
              <div>
                <p className="text-label-md uppercase text-on-surface-variant">Estado</p>
                <StatusBadge variant={selected.status} />
              </div>
            </div>
            <div className="border-t border-outline-variant pt-lg">
              <p className="mb-md font-label-md text-label-md uppercase text-on-surface-variant">Líneas del pedido</p>
              {selected.lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-md border-b border-outline-variant/10 py-sm last:border-0"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-container">
                    <Icon name={item.icon} size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-body-sm">{item.name}</p>
                    <p className="text-body-sm text-on-surface-variant">Cant.: {item.quantity}</p>
                  </div>
                  <span className="font-mono-sm text-mono-sm">
                    {formatCOP(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-sm rounded-lg bg-surface-container-low p-md">
              <div className="flex justify-between text-body-sm">
                <span>Subtotal</span>
                <span className="font-mono-sm">{formatCOP(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between text-body-sm">
                <span>Impuestos</span>
                <span className="font-mono-sm">{formatCOP(selected.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant pt-sm font-bold">
                <span>Total general</span>
                <span className="font-mono-sm text-primary">{formatCOP(selected.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
