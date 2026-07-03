import type { ChatProductOffer } from '../../types'
import { formatCOP, saleUnitLabel } from '../../utils/format'
import { StatusBadge } from '../ui/StatusBadge'
import { ProductOfferCarousel } from './ProductOfferCarousel'

interface ProductOfferListProps {
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

const CAROUSEL_THRESHOLD = 5

export function ProductOfferList({ offers, totalCount, onProductClick }: ProductOfferListProps) {
  if (offers.length === 0) return null

  const total = totalCount ?? offers.length
  const useCarousel = offers.length > CAROUSEL_THRESHOLD || total > CAROUSEL_THRESHOLD

  if (useCarousel) {
    return (
      <ProductOfferCarousel
        offers={offers}
        totalCount={total}
        onProductClick={onProductClick}
      />
    )
  }

  return (
    <div className="mt-sm flex flex-col gap-sm">
      <ul className="flex flex-col gap-sm">
        {offers.map((offer) => (
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
    </div>
  )
}
