import { useEffect, useMemo, useState } from 'react'
import type { ChatProductOffer } from '../../types'
import { formatCOP, saleUnitLabel } from '../../utils/format'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'

const ITEMS_PER_PAGE = 5

interface ProductOfferCarouselProps {
  offers: ChatProductOffer[]
  totalCount?: number
  onProductClick?: (offer: ChatProductOffer) => void
}

function stockBadge(stock: number) {
  if (stock === 0) {
    return <StatusBadge variant="out_of_stock" />
  }
  if (stock <= 10) {
    return <StatusBadge variant="critical" label={`${stock} u.`} />
  }
  if (stock <= 25) {
    return <StatusBadge variant="low_stock" label={`${stock} u.`} />
  }
  return (
    <span className="inline-block whitespace-nowrap rounded bg-primary-container/30 px-2 py-1 font-mono-sm text-xs font-semibold text-on-primary-container">
      {stock} u.
    </span>
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

  const rangeStart = offers.length === 0 ? 0 : activePage * ITEMS_PER_PAGE + 1
  const rangeEnd = Math.min((activePage + 1) * ITEMS_PER_PAGE, offers.length)

  if (offers.length === 0) return null

  return (
    <div className="mt-sm flex flex-col gap-sm">
      <ul className="flex flex-col gap-sm">
        {pageItems.map((offer) => (
          <li key={offer.productCode}>
            <button
              type="button"
              onClick={() => onProductClick?.(offer)}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-sm text-left transition-colors hover:border-primary/40 hover:bg-surface-container-low active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-label-md text-label-md text-on-surface">{offer.productName}</p>
                  <p className="font-mono-sm text-mono-sm text-on-surface-variant">{offer.productCode}</p>
                </div>
                {stockBadge(offer.stock)}
              </div>
              <p className="mt-xs font-mono-sm text-mono-sm font-semibold text-primary">
                {formatCOP(offer.unitPrice)}
                <span className="ml-1 font-normal text-on-surface-variant">
                  por {saleUnitLabel(offer.saleUnit)}
                </span>
              </p>
            </button>
          </li>
        ))}
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
