import { useEffect, useMemo, useState } from 'react'
import type { ChatProductOffer } from '../../types'
import { formatCOP, saleUnitLabel } from '../../utils/format'
import { padToPageSize } from '../../utils/paginatedGrid'
import { Icon } from '../ui/Icon'
import { ProductStockBadge } from './ProductStockBadge'

const ITEMS_PER_PAGE = 5

interface ProductOfferCarouselProps {
  offers: ChatProductOffer[]
  totalCount?: number
  onProductClick?: (offer: ChatProductOffer) => void
}

function ProductOfferPlaceholder() {
  return (
    <li aria-hidden className="invisible pointer-events-none h-[5.5rem] min-h-[5.5rem] max-h-[5.5rem]">
      <div className="h-full w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0 flex-1">
            <div className="h-4 w-3/4" />
            <div className="mt-1 h-3 w-1/3" />
          </div>
          <div className="h-6 w-12 shrink-0 rounded" />
        </div>
        <div className="mt-xs h-4 w-1/2" />
      </div>
    </li>
  )
}

export function ProductOfferCarousel({ offers, totalCount, onProductClick }: ProductOfferCarouselProps) {
  const [activePage, setActivePage] = useState(0)

  const total = totalCount ?? offers.length
  const pageCount = Math.max(1, Math.ceil(offers.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setActivePage((prev) => Math.min(prev, pageCount - 1))
  }, [offers.length, pageCount])

  const pageItems = useMemo(() => {
    const start = activePage * ITEMS_PER_PAGE
    return offers.slice(start, start + ITEMS_PER_PAGE)
  }, [offers, activePage])

  const paddedPageItems = useMemo(
    () => padToPageSize(pageItems, ITEMS_PER_PAGE),
    [pageItems],
  )

  const rangeStart = offers.length === 0 ? 0 : activePage * ITEMS_PER_PAGE + 1
  const rangeEnd = Math.min((activePage + 1) * ITEMS_PER_PAGE, offers.length)

  if (offers.length === 0) return null

  return (
    <div className="mt-sm flex flex-col gap-sm">
      <ul className="flex flex-col gap-sm">
        {paddedPageItems.map((offer, index) =>
          offer ? (
            <li key={offer.productCode} className="h-[5.5rem] min-h-[5.5rem] max-h-[5.5rem]">
              <button
                type="button"
                onClick={() => onProductClick?.(offer)}
                className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-sm text-left transition-colors hover:border-primary/40 hover:bg-surface-container-low active:scale-[0.99]"
              >
                <div className="flex min-h-0 flex-1 items-start justify-between gap-sm overflow-hidden">
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="line-clamp-2 overflow-hidden font-label-md text-label-md leading-snug text-on-surface">
                      {offer.productName}
                    </p>
                    <p className="truncate font-mono-sm text-mono-sm text-on-surface-variant">{offer.productCode}</p>
                  </div>
                  <ProductStockBadge stock={offer.stock} />
                </div>
                <p className="shrink-0 truncate whitespace-nowrap pt-xs font-mono-sm text-mono-sm font-semibold leading-normal text-primary">
                  {formatCOP(offer.unitPrice)}
                  <span className="ml-1 font-normal text-on-surface-variant">
                    por {saleUnitLabel(offer.saleUnit)}
                  </span>
                </p>
              </button>
            </li>
          ) : (
            <ProductOfferPlaceholder key={`placeholder-${index}`} />
          ),
        )}
      </ul>

      <div className="flex flex-col gap-sm">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Mostrando {rangeStart}-{rangeEnd} de {total}
        </p>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-md">
            <div className="flex flex-wrap gap-xs">
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
