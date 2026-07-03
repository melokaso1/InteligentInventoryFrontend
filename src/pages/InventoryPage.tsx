import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { InventoryItem } from '../types'
import { getUserFacingApiError } from '../api/client'
import {
  createInventoryAdjustment,
  fetchInventory,
  fetchInventoryCategories,
  fetchInventoryStats,
  fetchStockMovements,
} from '../api'
import { Icon } from '../components/ui/Icon'
import { Toast } from '../components/ui/Toast'
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
import { useToast } from '../hooks/useToast'
import { formatSecondsSince, useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { notifyDataMutation } from '../utils/dataSync'
import { StockStatusHelpCard } from '../components/inventory/StockStatusHelpCard'

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
const MOVEMENTS_PAGE_SIZE = 10

const ADJUSTMENT_REASONS = [
  'Corrección manual',
  'Recibir mercancía nueva',
  'Mercancía dañada',
  'Conteo de inventario',
] as const

const DEFAULT_ADJUSTMENT_REASON = ADJUSTMENT_REASONS[0]

const RECEIVE_STOCK_REASON = ADJUSTMENT_REASONS[1]

function clampAdjustmentDelta(
  currentStock: number,
  delta: number,
  maxStock: number,
): { delta: number; capped: boolean } {
  if (!Number.isFinite(maxStock) || maxStock <= 0) {
    return { delta: Math.max(-currentStock, delta), capped: false }
  }

  const resulting = currentStock + delta
  if (resulting > maxStock) {
    return { delta: maxStock - currentStock, capped: true }
  }

  if (resulting < 0) {
    return { delta: -currentStock, capped: delta !== -currentStock }
  }

  return { delta, capped: false }
}

export function InventoryPage() {
  const { toastMessage, showToast, dismissToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [movementsPage, setMovementsPage] = useState(1)
  const [movementsTotalCount, setMovementsTotalCount] = useState(0)
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
  const [quantityChange, setQuantityChange] = useState('')
  const [maxStockInput, setMaxStockInput] = useState('')
  const [quantityHint, setQuantityHint] = useState<string | null>(null)
  const [reason, setReason] = useState<(typeof ADJUSTMENT_REASONS)[number]>(DEFAULT_ADJUSTMENT_REASON)
  const [adjustProductSearch, setAdjustProductSearch] = useState('')
  const [debouncedAdjustProductSearch, setDebouncedAdjustProductSearch] = useState('')
  const [adjustProductOptions, setAdjustProductOptions] = useState<InventoryItem[]>([])
  const [adjustProductDropdownOpen, setAdjustProductDropdownOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isInitialLoad = useRef(true)
  const inventoryRequestId = useRef(0)
  const adjustProductPickerRef = useRef<HTMLDivElement>(null)

  const loadSummary = useCallback(async () => {
    try {
      const [statsResult, movementsResult] = await Promise.all([
        fetchInventoryStats(),
        fetchStockMovements({ page: movementsPage, pageSize: MOVEMENTS_PAGE_SIZE }),
      ])
      setStats(statsResult)
      setStockMovements(movementsResult.items)
      setMovementsTotalCount(movementsResult.totalCount)
    } catch {
      // KPIs and movements stay at current values if the summary request fails.
    }
  }, [movementsPage])

  const reloadInventoryTable = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++inventoryRequestId.current
    try {
      const inventoryResult = await fetchInventory(
        {
          q: debouncedSearch || undefined,
          category: categoryFilter || undefined,
          stockLevel: stockLevelFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      )
      if (requestId !== inventoryRequestId.current) return
      setInventoryItems(inventoryResult.items)
      setTotalCount(inventoryResult.totalCount)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (requestId !== inventoryRequestId.current) return
      // Keep current rows if a refresh fails.
    }
  }, [debouncedSearch, categoryFilter, stockLevelFilter, page])

  const reloadAfterAdjustment = useCallback(async () => {
    await Promise.all([loadSummary(), reloadInventoryTable()])
  }, [loadSummary, reloadInventoryTable])

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

  const refreshLiveData = useCallback(async () => {
    await Promise.all([loadSummary(), reloadInventoryTable()])
  }, [loadSummary, reloadInventoryTable])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const { secondsSinceUpdate } = useRealtimeRefresh(refreshLiveData, [refreshLiveData], {
    intervalMs: 5_000,
    scope: ['inventory', 'sales', 'products', 'invoices'],
  })

  useEffect(() => {
    const controller = new AbortController()
    if (!isInitialLoad.current) setRefreshing(true)

    void reloadInventoryTable(controller.signal).finally(() => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false
        setLoading(false)
      }
      setRefreshing(false)
    })

    return () => {
      controller.abort()
    }
  }, [reloadInventoryTable])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedAdjustProductSearch(adjustProductSearch.trim())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [adjustProductSearch])

  useEffect(() => {
    if (!modalOpen) return

    let cancelled = false

    async function loadAdjustProductOptions() {
      try {
        const result = await fetchInventory({
          q: debouncedAdjustProductSearch || undefined,
          pageSize: 50,
        })
        if (cancelled) return

        const items = [...result.items]
        if (selectedItem && !items.some((item) => item.id === selectedItem.id)) {
          items.unshift(selectedItem)
        }
        setAdjustProductOptions(items)
      } catch {
        if (!cancelled && selectedItem) {
          setAdjustProductOptions([selectedItem])
        }
      }
    }

    void loadAdjustProductOptions()
    return () => {
      cancelled = true
    }
  }, [modalOpen, debouncedAdjustProductSearch, selectedItem])

  useEffect(() => {
    if (!adjustProductDropdownOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        adjustProductPickerRef.current &&
        !adjustProductPickerRef.current.contains(event.target as Node)
      ) {
        setAdjustProductDropdownOpen(false)
        if (selectedItem) {
          setAdjustProductSearch(`${selectedItem.name} (${selectedItem.sku})`)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [adjustProductDropdownOpen, selectedItem])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount)

  const movementsTotalPages = Math.max(1, Math.ceil(movementsTotalCount / MOVEMENTS_PAGE_SIZE))
  const movementsRangeStart =
    movementsTotalCount === 0 ? 0 : (movementsPage - 1) * MOVEMENTS_PAGE_SIZE + 1
  const movementsRangeEnd = Math.min(movementsPage * MOVEMENTS_PAGE_SIZE, movementsTotalCount)

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
      change: formatSecondsSince(secondsSinceUpdate),
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
    setQuantityChange('')
    setMaxStockInput('')
    setQuantityHint(null)
    setReason(DEFAULT_ADJUSTMENT_REASON)
    setAdjustProductSearch('')
    setDebouncedAdjustProductSearch('')
    setAdjustProductOptions([])
    setAdjustProductDropdownOpen(false)
    setFormError(null)
  }

  const openAdjustModal = useCallback((
    item?: InventoryItem,
    options?: { reason?: (typeof ADJUSTMENT_REASONS)[number]; quantityChange?: number },
  ) => {
    setSelectedItem(item ?? null)
    setQuantityChange(
      options?.quantityChange !== undefined && options.quantityChange !== 0
        ? String(options.quantityChange)
        : '',
    )
    setMaxStockInput(item ? String(item.maxStock) : '')
    setQuantityHint(null)
    setReason(options?.reason ?? DEFAULT_ADJUSTMENT_REASON)
    setAdjustProductSearch(item ? `${item.name} (${item.sku})` : '')
    setDebouncedAdjustProductSearch('')
    setAdjustProductOptions(item ? [item] : [])
    setAdjustProductDropdownOpen(false)
    setFormError(null)
    setModalOpen(true)
  }, [])

  useEffect(() => {
    if (loading) return

    const action = searchParams.get('action')
    const sku = searchParams.get('sku')?.trim()
    if (action !== 'adjust' || !sku) return

    const qtyParam = searchParams.get('qty')
    const suggestedQty = qtyParam ? Number(qtyParam) : 0

    let cancelled = false

    async function openAdjustFromDeepLink() {
      try {
        const result = await fetchInventory({ q: sku, pageSize: 50 })
        if (cancelled) return

        const item = result.items.find((row) => row.sku === sku) ?? result.items[0]
        if (!item) return

        openAdjustModal(item, {
          reason: RECEIVE_STOCK_REASON,
          quantityChange: Number.isFinite(suggestedQty) && suggestedQty > 0 ? suggestedQty : 0,
        })
      } catch {
        // Deep link falls back to the inventory table if the product lookup fails.
      } finally {
        if (!cancelled) {
          setSearchParams({}, { replace: true })
        }
      }
    }

    void openAdjustFromDeepLink()
    return () => {
      cancelled = true
    }
  }, [loading, searchParams, setSearchParams, openAdjustModal])

  const handleSelectAdjustProduct = (item: InventoryItem) => {
    setSelectedItem(item)
    setAdjustProductSearch(`${item.name} (${item.sku})`)
    setAdjustProductDropdownOpen(false)
    setQuantityChange('')
    setMaxStockInput(String(item.maxStock))
    setQuantityHint(null)
    setFormError(null)
  }

  const adjustProductInputValue =
    adjustProductDropdownOpen || !selectedItem
      ? adjustProductSearch
      : `${selectedItem.name} (${selectedItem.sku})`

  const openDetailModal = (item: InventoryItem) => {
    setDetailItem(item)
    setDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setDetailModalOpen(false)
    setDetailItem(null)
  }

  const clampQuantityToMax = useCallback(() => {
    if (!selectedItem) return

    const trimmedQty = quantityChange.trim()
    if (trimmedQty === '') {
      setQuantityHint(null)
      return
    }

    const parsedQty = Number(trimmedQty)
    const parsedMaxStock = Number(maxStockInput.trim())
    if (!Number.isFinite(parsedQty) || !Number.isFinite(parsedMaxStock) || parsedMaxStock < 0) {
      return
    }

    const { delta, capped } = clampAdjustmentDelta(
      selectedItem.quantity,
      parsedQty,
      parsedMaxStock,
    )
    if (capped) {
      setQuantityChange(String(delta))
      setQuantityHint(
        `La cantidad se ajustó al límite máximo (${parsedMaxStock.toLocaleString('es-CO')} uds.).`,
      )
    } else {
      setQuantityHint(null)
    }
  }, [selectedItem, quantityChange, maxStockInput])

  const handleApplyAdjustment = async () => {
    if (!selectedItem) {
      setFormError('Selecciona un producto.')
      return
    }

    const trimmedMaxStock = maxStockInput.trim()
    const parsedMaxStock = Number(trimmedMaxStock)
    if (trimmedMaxStock === '' || !Number.isFinite(parsedMaxStock) || parsedMaxStock < 0) {
      setFormError('Ingresa un límite máximo válido.')
      return
    }

    const maxStockChanged = parsedMaxStock !== selectedItem.maxStock
    const needsCapOnlyFix = selectedItem.quantity > parsedMaxStock
    const trimmedQty = quantityChange.trim()
    let parsedQty = 0

    if (trimmedQty !== '') {
      const rawQty = Number(trimmedQty)
      if (!Number.isFinite(rawQty)) {
        setFormError('Ingresa una cantidad válida para el ajuste.')
        return
      }

      const { delta, capped } = clampAdjustmentDelta(
        selectedItem.quantity,
        rawQty,
        parsedMaxStock,
      )
      parsedQty = delta
      if (capped) {
        setQuantityChange(String(delta))
        setQuantityHint(
          `La cantidad se ajustó al límite máximo (${parsedMaxStock.toLocaleString('es-CO')} uds.).`,
        )
      }
    } else if (!maxStockChanged && !needsCapOnlyFix) {
      setFormError('Ingresa una cantidad válida para el ajuste.')
      return
    }

    if (parsedQty === 0 && !maxStockChanged && !needsCapOnlyFix) {
      setFormError('La cantidad del ajuste no puede ser cero.')
      return
    }

    setFormError(null)
    setSubmitting(true)
    try {
      const result = await createInventoryAdjustment({
        productId: selectedItem.id,
        quantityChange: parsedQty,
        maxStock: parsedMaxStock,
        reason,
      })
      await reloadAfterAdjustment()
      notifyDataMutation('inventory')
      closeModal()
      if (result.stockCapped) {
        showToast(
          `Stock ajustado al límite máximo (${result.maxStock.toLocaleString('es-CO')} uds.).`,
        )
      } else {
        showToast('Ajuste de stock aplicado correctamente.')
      }
    } catch (err) {
      setFormError(getUserFacingApiError(err, 'No se pudo aplicar el ajuste.'))
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
        <Toast message={toastMessage} onDismiss={dismissToast} />

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
          </div>
          <StockStatusHelpCard />

          <div className={`min-w-0 max-w-full overflow-x-auto ${refreshing ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high/50">
                  {(
                    [
                      { label: 'Nombre del producto', align: '' },
                      { label: 'SKU', align: '', hidden: 'md' },
                      { label: 'Categoría', align: '' },
                      { label: 'En stock', align: 'text-right' },
                      {
                        label: 'Estado',
                        align: '',
                        title:
                          'Nivel según stock actual vs. capacidad máxima: Crítico ≤10%, Bajo ≤30%, Medio ≤70%, Alto >70%',
                      },
                      { label: 'Precio unitario', align: 'text-right' },
                      { label: 'Acciones', align: 'text-center' },
                    ] as const
                  ).map((col) => (
                      <th
                        key={col.label}
                        title={'title' in col ? col.title : undefined}
                        className={`px-gutter py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant ${
                          col.label === 'SKU' ? 'hidden whitespace-nowrap md:table-cell' : ''
                        } ${col.align}`}
                      >
                        {col.label}
                      </th>
                    ))}
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
                    <td className="px-gutter py-4 text-right font-body-sm text-body-sm">
                      <span className="font-semibold text-on-surface">
                        {row.quantity.toLocaleString('es-CO')}
                      </span>
                      <span className="text-on-surface-variant">
                        {' '}
                        / {row.maxStock.toLocaleString('es-CO')} uds.
                      </span>
                    </td>
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
          {movementsTotalCount > 0 && (
            <div className="border-t border-outline-variant px-lg pb-lg pt-md">
              <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-sm text-on-surface-variant">
                  Mostrando {movementsRangeStart}-{movementsRangeEnd} de {movementsTotalCount}
                </p>
                {movementsTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-md sm:justify-end">
                    <div className="flex gap-xs">
                      {Array.from({ length: movementsTotalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Página ${i + 1}`}
                          aria-current={i + 1 === movementsPage ? 'page' : undefined}
                          onClick={() => setMovementsPage(i + 1)}
                          className={`h-2 rounded-full transition-all ${
                            i + 1 === movementsPage
                              ? 'w-6 bg-primary'
                              : 'w-2 bg-outline-variant hover:bg-primary/50'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-xs">
                      <button
                        type="button"
                        aria-label="Anterior"
                        disabled={movementsPage <= 1}
                        onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-outline-variant p-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                      >
                        <Icon name="chevron_left" size={20} />
                      </button>
                      <button
                        type="button"
                        aria-label="Siguiente"
                        disabled={movementsPage >= movementsTotalPages}
                        onClick={() => setMovementsPage((p) => Math.min(movementsTotalPages, p + 1))}
                        className="rounded-lg border border-outline-variant p-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                      >
                        <Icon name="chevron_right" size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
          <div ref={adjustProductPickerRef}>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">Producto</label>
            <div className="relative mt-1">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 scale-90 text-outline"
              />
              <input
                type="text"
                value={adjustProductInputValue}
                onChange={(e) => {
                  setAdjustProductSearch(e.target.value)
                  if (selectedItem) setSelectedItem(null)
                  setAdjustProductDropdownOpen(true)
                }}
                onFocus={() => {
                  setAdjustProductDropdownOpen(true)
                  if (selectedItem) {
                    setAdjustProductSearch('')
                    setSelectedItem(null)
                  }
                }}
                placeholder="Buscar por nombre o SKU..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {adjustProductDropdownOpen && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
                  {adjustProductOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-on-surface-variant">Sin resultados</li>
                  ) : (
                    adjustProductOptions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAdjustProduct(item)}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 ${
                            selectedItem?.id === item.id ? 'bg-primary/10 text-primary' : 'text-on-surface'
                          }`}
                        >
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-on-surface-variant"> ({item.sku})</span>
                          <span className="ml-2 text-xs text-on-surface-variant">
                            Stock: {item.quantity}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            {selectedItem && (
              <div className="mt-2 space-y-1 font-body-sm text-body-sm text-on-surface-variant">
                <p>
                  Stock actual:{' '}
                  <span className="font-bold text-on-surface">
                    {selectedItem.quantity.toLocaleString('es-CO')} uds.
                  </span>
                </p>
                <p>
                  Límite máximo actual:{' '}
                  <span className="font-bold text-on-surface">
                    {selectedItem.maxStock.toLocaleString('es-CO')} uds.
                  </span>
                </p>
                {selectedItem.quantity > Number(maxStockInput) &&
                  Number.isFinite(Number(maxStockInput)) &&
                  Number(maxStockInput) > 0 && (
                    <p className="text-xs text-primary">
                      El stock supera el límite. Al aplicar, se ajustará automáticamente.
                    </p>
                  )}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">
              Límite máximo
            </label>
            <input
              type="number"
              min={0}
              value={maxStockInput}
              onChange={(e) => {
                setMaxStockInput(e.target.value)
                setQuantityHint(null)
              }}
              onBlur={clampQuantityToMax}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Capacidad máxima de almacenamiento para este producto.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">
              Cantidad del ajuste
            </label>
            <input
              type="number"
              value={quantityChange}
              onChange={(e) => {
                setQuantityChange(e.target.value)
                setQuantityHint(null)
              }}
              onBlur={clampQuantityToMax}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Usa valores positivos para entradas y negativos para salidas.
            </p>
            {quantityHint && <p className="mt-1 text-xs text-primary">{quantityHint}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">Motivo</label>
            <Select
              className="mt-1 w-full rounded-lg border border-outline-variant pl-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={reason}
              onChange={(e) => setReason(e.target.value as (typeof ADJUSTMENT_REASONS)[number])}
            >
              {ADJUSTMENT_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
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
              { label: 'Stock actual', value: `${detailItem.quantity.toLocaleString('es-CO')} uds.` },
              { label: 'Límite máximo', value: `${detailItem.maxStock.toLocaleString('es-CO')} uds.` },
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
