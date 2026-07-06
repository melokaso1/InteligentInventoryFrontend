import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Sale } from '../types'
import { getUserFacingApiError } from '../api/client'
import { createSaleInvoice, fetchSales, fetchSaleMetrics } from '../api'
import {
  buildVisiblePageNumbers,
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
  PaginationPageButton,
  PaginationPages,
} from '../components/ui/Pagination'
import { formatCOP, formatDateTime } from '../utils/format'
import { CreateManualSaleDrawer } from '../components/sales/CreateManualSaleDrawer'
import { DataTable } from '../components/ui/DataTable'
import { Drawer } from '../components/ui/Drawer'
import { Icon } from '../components/ui/Icon'
import { KpiCard } from '../components/ui/KpiCard'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Toast } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { notifyDataMutation } from '../utils/dataSync'
import {
  DEFAULT_SALES_DATE_PRESET,
  SALES_DATE_PRESET_LABELS,
  SALES_DATE_PRESET_OPTIONS,
  getSalesDateRangeForPreset,
  type SalesDatePreset,
} from '../utils/salesDatePresets'

const PAGE_SIZE = 8

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
  const navigate = useNavigate()
  const { toastMessage, showToast, dismissToast } = useToast()
  const [sales, setSales] = useState<Sale[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
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
  const [datePreset, setDatePreset] = useState<SalesDatePreset>(DEFAULT_SALES_DATE_PRESET)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [creatingSale, setCreatingSale] = useState(false)
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [invoiceFeedback, setInvoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )
  const isInitialLoad = useRef(true)

  const dateRange = useMemo(() => getSalesDateRangeForPreset(datePreset), [datePreset])
  const periodLabel = SALES_DATE_PRESET_LABELS[datePreset]

  const loadSales = useCallback(async () => {
    const { fromDate, toDate } = dateRange
    const origin = originFilter === 'all' ? undefined : originFilter
    const [salesResult, metricsResult] = await Promise.all([
      fetchSales({
        from: fromDate,
        to: toDate,
        origin,
        page,
        pageSize: PAGE_SIZE,
      }),
      fetchSaleMetrics({
        from: fromDate,
        to: toDate,
        origin,
      }),
    ])
    setSales(salesResult.items)
    setTotalCount(salesResult.totalCount)
    setMetrics(metricsResult)
  }, [dateRange, originFilter, page])

  useEffect(() => {
    setPage(1)
  }, [datePreset, originFilter])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (isInitialLoad.current) {
        setLoading(true)
      }
      try {
        if (!cancelled) await loadSales()
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
  }, [loadSales, dateRange, originFilter])

  useRealtimeRefresh(loadSales, [loadSales], { scope: ['sales', 'invoices'] })

  const openDrawer = (sale: Sale) => {
    setInvoiceFeedback(null)
    setSelected(sale)
    setDrawerOpen(true)
  }

  const handleGenerateInvoice = async (sale: Sale) => {
    if (generatingId || sale.status === 'invoiced') return

    setGeneratingId(sale.id)
    setInvoiceFeedback(null)
    try {
      await createSaleInvoice(sale.id)
      notifyDataMutation('invoices')
      notifyDataMutation('sales')
      notifyDataMutation('inventory')
      notifyDataMutation('dashboard')
      await loadSales()
      showToast('Factura generada correctamente.')
      setDrawerOpen(false)
      navigate('/invoices')
    } catch (err) {
      const message = getUserFacingApiError(err, 'No se pudo generar la factura.')
      setInvoiceFeedback({ type: 'error', message })
    } finally {
      setGeneratingId(null)
    }
  }

  const openCreateDrawer = () => {
    setCreateFormError(null)
    setCreateDrawerOpen(true)
    setDrawerOpen(false)
  }

  const closeCreateDrawer = () => {
    if (creatingSale) return
    setCreateDrawerOpen(false)
    setCreateFormError(null)
  }

  const handleManualSaleCreated = async (sale: Sale) => {
    await loadSales()
    notifyDataMutation('sales')
    notifyDataMutation('inventory')
    notifyDataMutation('dashboard')
    setCreateDrawerOpen(false)
    setCreateFormError(null)
    setSelected(sale)
    setDrawerOpen(true)
    showToast('Venta creada. Genera la factura cuando el cliente confirme el pedido.')
  }

  const orderCount = metrics.totalSales
  const totalRevenue = metrics.totalRevenue
  const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const visiblePages = buildVisiblePageNumbers(page, totalPages)
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount)
  const selectedGenerating = selected ? generatingId === selected.id : false
  const selectedAlreadyInvoiced = selected?.status === 'invoiced'

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
        <Toast message={toastMessage} onDismiss={dismissToast} />

        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <h3 className="text-headline-sm font-bold text-on-background md:font-display-lg md:text-display-lg">
              Ventas
            </h3>
            <p className="mt-0.5 hidden text-body-sm text-on-surface-variant md:block">
              Crea pedidos manuales, genera facturas y supervisa el despacho.
            </p>
          </div>
          <PrimaryActionButton className="shrink-0" onClick={openCreateDrawer} disabled={creatingSale}>
            Nueva venta
          </PrimaryActionButton>
        </div>

        {createFormError ? (
          <p className="rounded-lg border border-error/30 bg-error/10 px-md py-sm text-body-sm text-error" role="alert">
            {createFormError}
          </p>
        ) : null}

        <div className="flex min-w-0 max-w-full flex-col gap-md overflow-hidden rounded-xl border border-outline-variant bg-surface p-md shadow-sm md:flex-row md:flex-wrap md:items-end">
            <div className="min-w-0 w-full md:min-w-[200px] md:flex-1">
              <label className="mb-1 block font-label-md text-label-md text-on-surface-variant">
                Rango de fechas
              </label>
              <Select
                className="w-full min-w-0 shrink rounded-lg border border-outline bg-surface-container-lowest py-2.5 pl-3 text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary md:w-auto"
                value={datePreset}
                onChange={(event) => setDatePreset(event.target.value as SalesDatePreset)}
              >
                {SALES_DATE_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 w-full md:min-w-[200px] md:flex-1">
              <label className="mb-1 block font-label-md text-label-md text-on-surface-variant">
                Origen
              </label>
              <div className="grid min-h-[42px] min-w-0 grid-cols-3 overflow-hidden rounded-lg border border-outline bg-surface-container-lowest">
                {(['all', 'manual', 'chatbot'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOriginFilter(value)}
                    className={`min-w-0 px-1 py-2.5 text-center text-body-sm font-medium whitespace-nowrap transition-colors sm:px-2 sm:text-body-md ${
                      originFilter === value
                        ? 'bg-primary text-on-primary'
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
        </div>

        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Ventas totales (período)"
            value={formatCOP(totalRevenue)}
            change={`${orderCount} pedidos · ${periodLabel}`}
            changeType="positive"
            icon="payments"
            iconBg="bg-primary-container"
            iconColor="text-on-primary-container"
          />
          <KpiCard
            label="Pedidos"
            value={orderCount.toLocaleString('es-CO')}
            change={periodLabel}
            changeType="neutral"
            icon="shopping_cart"
            iconBg="bg-tertiary-container"
            iconColor="text-on-tertiary-container"
          />
          <KpiCard
            label="Ticket medio"
            value={formatCOP(avgTicket)}
            change={periodLabel}
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
          {invoiceFeedback ? (
            <p
              className={`border-b border-outline-variant px-lg py-sm text-body-sm ${
                invoiceFeedback.type === 'error' ? 'text-error' : 'text-primary'
              }`}
              role={invoiceFeedback.type === 'error' ? 'alert' : 'status'}
            >
              {invoiceFeedback.message}
            </p>
          ) : null}
          <DataTable
            data={sales}
            getRowId={(row) => row.id}
            onRowClick={openDrawer}
            renderMobileCard={(row) => (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-xs font-bold text-tertiary">
                  {customerInitials(row.customer)}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="font-mono text-xs font-bold text-primary">#{shortOrderId(row.id)}</p>
                  <p className="line-clamp-1 overflow-hidden font-body-md font-semibold text-on-surface">
                    {row.customer}
                  </p>
                  <p className="truncate text-body-sm text-on-surface-variant">{formatDateTime(row.date)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                  <span className="whitespace-nowrap font-semibold">{formatCOP(row.total)}</span>
                  <StatusBadge variant={row.status} />
                </div>
              </div>
            )}
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
              {
                key: 'date',
                header: 'Fecha y hora',
                nowrap: true,
                render: (row) => (
                  <span className="text-on-surface-variant">{formatDateTime(row.date)}</span>
                ),
              },
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
                key: 'fulfillment',
                header: 'Despacho',
                hideOnTablet: true,
                render: (row) => (
                  <StatusBadge variant={row.fulfillmentStatus ?? 'preparing'} />
                ),
              },
              {
                key: 'actions',
                header: 'Acciones',
                className: 'text-right',
                render: (row) => (
                  <div
                    className="flex justify-end gap-2 opacity-80 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Ver detalle"
                      onClick={() => openDrawer(row)}
                      className="rounded-lg p-2 text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Icon name="description" />
                    </button>
                    {row.fulfillmentStatus !== 'delivered' && row.status !== 'cancelled' ? (
                      <button
                        type="button"
                        title="Despachar pedido"
                        onClick={() => navigate('/dispatch')}
                        className="rounded-lg p-2 text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Icon name="local_shipping" />
                      </button>
                    ) : null}
                    {row.status === 'invoiced' ? (
                      <button
                        type="button"
                        title="Ver factura"
                        onClick={() => navigate('/invoices')}
                        className="rounded-lg p-2 text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Icon name="receipt" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={generatingId === row.id}
                        title="Generar factura"
                        onClick={() => void handleGenerateInvoice(row)}
                        className="rounded-lg p-2 text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Icon name="request_quote" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          <PaginationFooter className="p-md">
            <PaginationInfo>
              {totalCount === 0 ? (
                'Sin resultados'
              ) : (
                <>
                  Mostrando{' '}
                  <span className="font-bold">
                    {rangeStart.toLocaleString('es-CO')} a {rangeEnd.toLocaleString('es-CO')}
                  </span>{' '}
                  de {totalCount.toLocaleString('es-CO')} registros
                </>
              )}
            </PaginationInfo>
            <PaginationControls>
              <PaginationIconButton
                icon="chevron_left"
                disabled={page <= 1}
                className="disabled:opacity-30"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <PaginationPages>
                {visiblePages.length > 0 && visiblePages[0] > 1 ? (
                  <>
                    <PaginationPageButton onClick={() => setPage(1)}>1</PaginationPageButton>
                    {visiblePages[0] > 2 ? (
                      <span className="shrink-0 px-1 text-on-surface-variant" aria-hidden="true">
                        …
                      </span>
                    ) : null}
                  </>
                ) : null}
                {visiblePages.map((pageNumber) => (
                  <PaginationPageButton
                    key={pageNumber}
                    active={pageNumber === page}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationPageButton>
                ))}
                {visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages ? (
                  <>
                    {visiblePages[visiblePages.length - 1] < totalPages - 1 ? (
                      <span className="shrink-0 px-1 text-on-surface-variant" aria-hidden="true">
                        …
                      </span>
                    ) : null}
                    <PaginationPageButton onClick={() => setPage(totalPages)}>
                      {totalPages}
                    </PaginationPageButton>
                  </>
                ) : null}
              </PaginationPages>
              <PaginationIconButton
                icon="chevron_right"
                disabled={page >= totalPages || totalPages === 0}
                className="disabled:opacity-30"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </PaginationControls>
          </PaginationFooter>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalles de la venta"
        subtitle={selected ? shortOrderId(selected.id) : undefined}
        width="500px"
        footer={
          <div className="space-y-sm">
            {invoiceFeedback ? (
              <p
                className={`text-body-sm ${invoiceFeedback.type === 'error' ? 'text-error' : 'text-primary'}`}
                role="alert"
              >
                {invoiceFeedback.message}
              </p>
            ) : null}
            <button
              type="button"
              disabled={selectedGenerating}
              onClick={() => {
                if (!selected) return
                if (selectedAlreadyInvoiced) {
                  navigate('/invoices')
                  return
                }
                void handleGenerateInvoice(selected)
              }}
              className="w-full rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedGenerating
                ? 'Generando factura…'
                : selectedAlreadyInvoiced
                  ? 'Ver factura'
                  : 'Generar factura'}
            </button>
          </div>
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
              <div>
                <p className="text-label-md uppercase text-on-surface-variant">Despacho</p>
                <StatusBadge variant={selected.fulfillmentStatus ?? 'preparing'} />
              </div>
            </div>
            {selected.fulfillmentStatus !== 'delivered' && selected.status !== 'cancelled' ? (
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false)
                  navigate('/dispatch')
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary py-2 font-label-md text-label-md text-primary hover:bg-primary/10"
              >
                <Icon name="local_shipping" size={18} />
                Ir a Despacho
              </button>
            ) : null}
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

      <CreateManualSaleDrawer
        open={createDrawerOpen}
        creating={creatingSale}
        onClose={closeCreateDrawer}
        onCreatingChange={setCreatingSale}
        onCreated={(sale) => void handleManualSaleCreated(sale)}
        onError={setCreateFormError}
      />
    </>
  )
}
