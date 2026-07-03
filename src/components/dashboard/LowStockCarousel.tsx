import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { LowStockItem } from '../../types'
import { padToPageSize } from '../../utils/paginatedGrid'

const ITEMS_PER_PAGE = 9

const STATUS_ORDER: Record<LowStockItem['status'], number> = {
  out_of_stock: 0,
  critical: 1,
  low_stock: 2,
}

function sortByUrgency(items: LowStockItem[]) {
  return [...items].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (statusDiff !== 0) return statusDiff
    return a.currentStock - b.currentStock
  })
}

function stockBarWidth(stock: number, reorder: number) {
  return Math.min(100, Math.round((stock / Math.max(reorder, 1)) * 100))
}

function stockBarColor(stock: number, reorder: number) {
  const pct = stock / Math.max(reorder, 1)
  if (pct <= 0.25) return 'bg-error'
  if (pct <= 0.5) return 'bg-primary-dim'
  return 'bg-primary'
}

function statusLabel(status: string) {
  if (status === 'critical' || status === 'out_of_stock') {
    return { text: 'CRÍTICO', className: 'bg-error text-on-error' }
  }
  if (status === 'low_stock') return { text: 'REPOSICIÓN', className: 'bg-error/10 text-error' }
  return { text: 'ADVERTENCIA', className: 'bg-primary/10 text-primary' }
}

function LowStockCardPlaceholder() {
  return (
    <article
      aria-hidden
      className="invisible pointer-events-none flex h-[10.5rem] min-h-[10.5rem] max-h-[10.5rem] flex-col rounded-xl border border-outline-variant bg-surface-container-low p-md"
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0 flex-1">
          <div className="h-5" />
          <div className="mt-xs h-3 w-2/3" />
        </div>
        <span className="h-5 w-14 shrink-0 rounded" />
      </div>
      <div className="mt-md flex items-center gap-sm">
        <div className="h-1.5 flex-1 rounded-full" />
        <span className="h-4 w-12 shrink-0" />
      </div>
      <div className="mt-md h-9 w-full rounded-lg" />
    </article>
  )
}

interface LowStockCarouselProps {
  items: LowStockItem[]
}

export function LowStockCarousel({ items }: LowStockCarouselProps) {
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState(0)

  const sortedItems = useMemo(() => sortByUrgency(items), [items])
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setActivePage((prev) => Math.min(prev, pageCount - 1))
  }, [sortedItems.length, pageCount])

  const pageItems = useMemo(() => {
    const start = activePage * ITEMS_PER_PAGE
    return sortedItems.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedItems, activePage])

  const paddedPageItems = useMemo(
    () => padToPageSize(pageItems, ITEMS_PER_PAGE),
    [pageItems],
  )

  const rangeStart = sortedItems.length === 0 ? 0 : activePage * ITEMS_PER_PAGE + 1
  const rangeEnd = Math.min((activePage + 1) * ITEMS_PER_PAGE, sortedItems.length)

  if (sortedItems.length === 0) {
    return <p className="px-lg py-xl text-center text-on-surface-variant">Sin alertas de stock bajo</p>
  }

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col p-lg">
      <div className="grid min-w-0 w-full max-w-full flex-1 grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-3">
        {paddedPageItems.map((item, index) => {
          if (!item) {
            return <LowStockCardPlaceholder key={`placeholder-${index}`} />
          }

          const status = statusLabel(item.status)
          const barPct = stockBarWidth(item.currentStock, item.reorderLevel)
          return (
            <article
              key={item.id}
              className="flex h-[10.5rem] min-h-[10.5rem] max-h-[10.5rem] flex-col rounded-xl border border-outline-variant bg-surface-container-low p-md transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h4 className="line-clamp-2 h-[2.5rem] overflow-hidden font-body-md font-bold leading-snug text-on-surface">
                    {item.name}
                  </h4>
                  <p className="truncate font-mono text-xs text-on-surface-variant">{item.sku}</p>
                </div>
                <span className={`shrink-0 rounded px-sm py-xs text-[11px] font-bold ${status.className}`}>
                  {status.text}
                </span>
              </div>
              <div className="mt-md flex items-center gap-sm">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className={`h-full ${stockBarColor(item.currentStock, item.reorderLevel)}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-body-sm font-bold">{item.currentStock} uds.</span>
              </div>
              <button
                type="button"
                className="mt-md flex w-full items-center justify-center gap-xs rounded-lg border border-outline-variant py-xs text-sm text-primary transition-colors hover:bg-primary/10"
                onClick={() => {
                  const suggestedQty = Math.max(1, item.reorderLevel - item.currentStock)
                  navigate(
                    `/inventory?action=adjust&sku=${encodeURIComponent(item.sku)}&qty=${suggestedQty}`,
                  )
                }}
              >
                <Icon name="shopping_cart_checkout" size={18} />
                Reponer stock
              </button>
            </article>
          )
        })}
      </div>

      <div className="mt-md flex min-w-0 w-full max-w-full flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-on-surface-variant">
          Mostrando {rangeStart}-{rangeEnd} de {sortedItems.length}
        </p>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-md sm:justify-end">
            <div className="flex gap-xs">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Página ${i + 1}`}
                  aria-current={i === activePage ? 'page' : undefined}
                  onClick={() => setActivePage(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === activePage ? 'w-6 bg-primary' : 'w-2 bg-outline-variant hover:bg-primary/50'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-xs">
              <button
                type="button"
                aria-label="Anterior"
                disabled={activePage === 0}
                onClick={() => setActivePage((p) => p - 1)}
                className="rounded-lg border border-outline-variant p-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
              >
                <Icon name="chevron_left" size={20} />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                disabled={activePage >= pageCount - 1}
                onClick={() => setActivePage((p) => p + 1)}
                className="rounded-lg border border-outline-variant p-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
              >
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
