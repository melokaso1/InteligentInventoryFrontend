import { useCallback, useEffect, useRef, useState } from 'react'
import type { InventoryItem } from '../types'
import { ApiError } from '../api/client'
import {
  createInventoryAdjustment,
  fetchInventory,
  fetchInventoryCategories,
  fetchInventoryStats,
  fetchStockMovements,
} from '../api'
import { Icon } from '../components/ui/Icon'
import { formatCOP, formatCOPCompact } from '../utils/format'
import { Modal } from '../components/ui/Modal'
import {
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
  PaginationPageButton,
} from '../components/ui/Pagination'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import type { StockMovement } from '../types'

const stockLevelBadge: Record<string, string> = {
  high: 'bg-primary/10 text-primary border border-primary/20',
  medium: 'bg-tertiary-container text-on-tertiary-container border border-outline-variant',
  low: 'bg-on-tertiary-fixed-variant/10 text-on-tertiary-fixed-variant border border-outline-variant',
  critical: 'bg-error/10 text-error border border-error/20',
}

const stockLevelLabels: Record<string, string> = {
  high: 'ALTO',
  medium: 'MEDIO',
  low: 'BAJO',
  critical: 'CRÍTICO',
}

const stockLevelOptions = [
  { value: '', label: 'Todos los niveles de stock' },
  { value: 'critical', label: 'Crítico' },
  { value: 'low', label: 'Bajo' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
] as const

const PAGE_SIZE = 15

export function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUnits: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockLevelFilter, setStockLevelFilter] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null)
  const [quantityChange, setQuantityChange] = useState(0)
  const [reason, setReason] = useState('Corrección manual')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isInitialLoad = useRef(true)
  const inventoryRequestId = useRef(0)

  const reloadAfterAdjustment = useCallback(async () => {
    const requestId = ++inventoryRequestId.current
    const [inventoryResult, statsResult, movements] = await Promise.all([
      fetchInventory({
        q: debouncedSearch || undefined,
        category: categoryFilter || undefined,
        stockLevel: stockLevelFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
      fetchInventoryStats(),
      fetchStockMovements(10),
    ])
    if (requestId !== inventoryRequestId.current) return
    setInventoryItems(inventoryResult.items)
    setTotalCount(inventoryResult.totalCount)
    setStats(statsResult)
    setStockMovements(movements)
  }, [debouncedSearch, categoryFilter, stockLevelFilter, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, stockLevelFilter])

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      try {
        const result = await fetchInventoryCategories()
        if (!cancelled) setCategories(result)
      } catch {
        // Dropdown falls back to empty until categories load.
      }
    }

    void loadCategories()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      try {
        const [statsResult, movements] = await Promise.all([
          fetchInventoryStats(),
          fetchStockMovements(10),
        ])
        if (!cancelled) {
          setStats(statsResult)
          setStockMovements(movements)
        }
      } catch {
        // KPIs and movements stay at defaults if the summary request fails.
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++inventoryRequestId.current

    async function loadInventory() {
      if (!isInitialLoad.current) setRefreshing(true)

      try {
        const inventoryResult = await fetchInventory(
          {
            q: debouncedSearch || undefined,
            category: categoryFilter || undefined,
            stockLevel: stockLevelFilter || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          controller.signal,
        )
        if (requestId !== inventoryRequestId.current) return
        setInventoryItems(inventoryResult.items)
        setTotalCount(inventoryResult.totalCount)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (requestId !== inventoryRequestId.current) return
        // Keep current rows if a non-abort error occurs.
      } finally {
        if (requestId !== inventoryRequestId.current) return
        if (isInitialLoad.current) {
          isInitialLoad.current = false
          setLoading(false)
        }
        setRefreshing(false)
      }
    }

    void loadInventory()
    return () => {
      controller.abort()
    }
  }, [debouncedSearch, categoryFilter, stockLevelFilter, page])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount)

  const inventoryKpis = [
    {
      label: 'Total de SKU',
      value: stats.totalItems.toLocaleString('es-CO'),
      change: `${stats.totalUnits.toLocaleString('es-CO')} uds`,
      note: 'Productos activos en almacén',
      icon: 'category',
    },
    {
      label: 'Valor total del inventario',
      value: formatCOPCompact(stats.totalValue),
      change: 'Tiempo real',
      note: 'Valor estimado de mercado del stock',
      icon: 'payments',
    },
    {
      label: 'Artículos con stock crítico',
      value: String(stats.lowStockCount + stats.outOfStockCount),
      change: stats.outOfStockCount > 0 ? `${stats.outOfStockCount} sin stock` : 'Controlado',
      note: 'Artículos que requieren reposición inmediata',
      icon: 'warning',
      critical: stats.lowStockCount + stats.outOfStockCount > 0,
    },
  ]

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setSelectedItem(null)
    setQuantityChange(0)
    setReason('Corrección manual')
    setFormError(null)
  }

  const openAdjustModal = (item?: InventoryItem) => {
    setSelectedItem(item ?? null)
    setQuantityChange(0)
    setReason('Corrección manual')
    setFormError(null)
    setModalOpen(true)
  }

  const openDetailModal = (item: InventoryItem) => {
    setDetailItem(item)
    setDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setDetailModalOpen(false)
    setDetailItem(null)
  }

  const handleApplyAdjustment = async () => {
    if (!selectedItem) {
      setFormError('Selecciona un producto.')
      return
    }
    if (quantityChange === 0) {
      setFormError('La cantidad del ajuste no puede ser cero.')
      return
    }

    setFormError(null)
    setSubmitting(true)
    try {
      await createInventoryAdjustment({
        productId: selectedItem.id,
        quantityChange,
        reason,
      })
      await reloadAfterAdjustment()
      closeModal()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo aplicar el ajuste.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando inventario…
      </div>
    )
  }

  return (
    <>
      <div className="min-w-0 space-y-lg">
        <div className="flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Resumen de inventario</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Gestiona y supervisa los niveles de stock empresarial en tiempo real.
            </p>
          </div>
          <PrimaryActionButton onClick={() => openAdjustModal()}>
            Ajuste manual
          </PrimaryActionButton>
        </div>

        <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
          {inventoryKpis.map((kpi) => (
            <div
              key={kpi.label}
              className={`relative flex flex-col gap-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm ${
                kpi.critical ? 'overflow-hidden' : ''
              }`}
            >
              {kpi.critical && <div className="absolute right-0 top-0 h-full w-1 bg-error" />}
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  {kpi.label}
                </span>
                <Icon name={kpi.icon} className={kpi.critical ? 'text-error' : 'text-primary'} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${kpi.critical ? 'text-error' : 'text-on-surface'}`}>
                  {kpi.value}
                </span>
                <span className={`text-xs font-bold ${kpi.critical ? 'text-error' : 'text-primary'}`}>
                  {kpi.change}
                </span>
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">{kpi.note}</p>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex min-w-0 flex-col flex-wrap items-stretch gap-md border-b border-outline-variant bg-surface-container-low p-md sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="filter_list"
                className="absolute left-3 top-1/2 -translate-y-1/2 scale-90 text-outline"
              />
              <input
                className="w-full rounded border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-0"
                placeholder="Filtrar por producto o SKU..."
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-w-0 w-full rounded border border-outline-variant bg-surface-container-lowest pl-3 py-2 text-sm focus:border-primary focus:ring-0 outline-none sm:w-auto"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select
              value={stockLevelFilter}
              onChange={(e) => setStockLevelFilter(e.target.value)}
              className="min-w-0 w-full rounded border border-outline-variant bg-surface-container-lowest pl-3 py-2 text-sm focus:border-primary focus:ring-0 outline-none sm:w-auto"
            >
              {stockLevelOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-outline px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-variant"
            >
              <Icon name="download" size={16} />
              Exportar
            </button>
          </div>

          <div className={`min-w-0 max-w-full overflow-x-auto ${refreshing ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high/50">
                  {['Nombre del producto', 'SKU', 'Categoría', 'En stock', 'Estado', 'Precio unitario', 'Acciones'].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-gutter py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant ${
                          col === 'SKU' ? 'hidden whitespace-nowrap md:table-cell' : ''
                        } ${
                          i === 3 || i === 5 ? 'text-right' : i === 6 ? 'text-center' : ''
                        }`}
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface">
                {inventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-gutter py-8 text-center text-on-surface-variant">
                      No se encontraron productos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  inventoryItems.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openAdjustModal(row)}
                    className="cursor-pointer transition-colors hover:bg-primary/[0.04]"
                  >
                    <td className="px-gutter py-4 font-body-md font-bold text-on-surface">
                      <div className="min-w-0">
                        <p>{row.name}</p>
                        <p className="mt-0.5 font-mono text-xs font-normal text-on-surface-variant md:hidden">
                          {row.sku}
                        </p>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-gutter py-4 md:table-cell">
                      <span className="inline-block rounded border border-outline-variant bg-surface-container px-2 py-0.5 font-mono text-xs text-on-surface dark:bg-surface-container-high">
                        {row.sku}
                      </span>
                    </td>
                    <td className="px-gutter py-4 font-body-sm text-body-sm text-on-surface">{row.category}</td>
                    <td className="px-gutter py-4 text-right font-body-sm text-body-sm">{row.quantity}</td>
                    <td className="px-gutter py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tighter ${stockLevelBadge[row.stockLevel]}`}
                      >
                        {stockLevelLabels[row.stockLevel] ?? row.stockLevel}
                      </span>
                    </td>
                    <td className="px-gutter py-4 text-right font-body-sm text-body-sm">
                      {formatCOP(row.unitPrice)}
                    </td>
                    <td className="px-gutter py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openAdjustModal(row)
                          }}
                          className="rounded p-2 text-primary transition-colors hover:bg-primary/10"
                          title="Ajustar stock"
                        >
                          <Icon name="edit_square" size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetailModal(row)
                          }}
                          className="rounded p-2 text-on-surface-variant transition-colors hover:bg-secondary/10"
                          title="Ver detalles"
                        >
                          <Icon name="visibility" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <PaginationPageButton
                  key={pageNumber}
                  active={pageNumber === page}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </PaginationPageButton>
              ))}
              <PaginationIconButton
                icon="chevron_right"
                disabled={page >= totalPages || totalPages === 0}
                className="disabled:opacity-30"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </PaginationControls>
          </PaginationFooter>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant p-lg">
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Movimientos recientes</h4>
          </div>
          <div className="space-y-md p-lg">
            {stockMovements.length === 0 ? (
              <p className="text-on-surface-variant">Sin movimientos recientes</p>
            ) : (
              stockMovements.map((m) => (
                <div key={m.id} className="flex items-start gap-md">
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
                      m.type === 'inbound'
                        ? 'bg-primary-container/30 text-on-primary-container'
                        : m.type === 'outbound'
                          ? 'bg-error-container/20 text-error'
                          : 'bg-warning-container/80 text-on-warning-container'
                    }`}
                  >
                    <Icon
                      name={m.type === 'inbound' ? 'arrow_downward' : m.type === 'outbound' ? 'arrow_upward' : 'edit'}
                      size={16}
                    />
                  </div>
                  <div>
                    <p className="font-body-md font-semibold">{m.detail}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {m.sku} • {m.change}
                    </p>
                    <p className="mt-1 font-mono-sm text-mono-sm text-outline">{m.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Ajustar stock"
        icon="inventory_2"
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleApplyAdjustment()}
              disabled={submitting || !selectedItem}
              className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary disabled:opacity-50"
            >
              {submitting ? 'Aplicando…' : 'Aplicar ajuste'}
            </button>
          </div>
        }
      >
        <div className="space-y-md">
          {!selectedItem ? (
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">Producto</label>
              <Select
                className="mt-1 w-full rounded-lg border border-outline-variant pl-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value=""
                onChange={(e) => {
                  const item = inventoryItems.find((i) => i.id === e.target.value)
                  if (item) setSelectedItem(item)
                }}
              >
                <option value="">Seleccionar producto…</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <>
              <p className="font-body-md text-body-md">
                <span className="font-semibold">{selectedItem.name}</span>
                <span className="text-on-surface-variant"> ({selectedItem.sku})</span>
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Cantidad actual: <span className="font-bold text-on-surface">{selectedItem.quantity}</span>
              </p>
            </>
          )}
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">
              Cantidad del ajuste
            </label>
            <input
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Usa valores positivos para entradas y negativos para salidas.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">Motivo</label>
            <Select
              className="mt-1 w-full rounded-lg border border-outline-variant pl-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Corrección manual">Corrección manual</option>
              <option value="Mercancía dañada">Mercancía dañada</option>
              <option value="Conteo de inventario">Conteo de inventario</option>
            </Select>
          </div>
          {formError && <p className="text-sm text-error">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={detailModalOpen}
        onClose={closeDetailModal}
        title="Detalle del producto"
        icon="visibility"
        footer={
          <button
            type="button"
            onClick={closeDetailModal}
            className="w-full rounded-lg border border-outline-variant py-2 font-label-md text-label-md"
          >
            Cerrar
          </button>
        }
      >
        {detailItem && (
          <dl className="space-y-md text-sm">
            {[
              { label: 'Nombre', value: detailItem.name },
              { label: 'SKU', value: detailItem.sku },
              { label: 'Categoría', value: detailItem.category },
              { label: 'Almacén', value: detailItem.warehouse },
              { label: 'Cantidad', value: detailItem.quantity.toLocaleString('es-CO') },
              {
                label: 'Nivel de stock',
                value: stockLevelLabels[detailItem.stockLevel] ?? detailItem.stockLevel,
              },
              { label: 'Precio unitario', value: formatCOP(detailItem.unitPrice) },
            ].map((field) => (
              <div key={field.label} className="flex justify-between gap-md border-b border-outline-variant/40 pb-2">
                <dt className="text-on-surface-variant">{field.label}</dt>
                <dd className="text-right font-semibold text-on-surface">{field.value}</dd>
              </div>
            ))}
            <div>
              <div className="mb-1 flex justify-between text-on-surface-variant">
                <dt>Stock (%)</dt>
                <dd className="font-semibold text-on-surface">{detailItem.stockPercent}%</dd>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={`h-full rounded-full ${
                    detailItem.stockLevel === 'critical'
                      ? 'bg-error'
                      : detailItem.stockLevel === 'low'
                        ? 'bg-on-tertiary-fixed-variant'
                        : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, detailItem.stockPercent))}%` }}
                />
              </div>
            </div>
          </dl>
        )}
      </Modal>
    </>
  )
}
