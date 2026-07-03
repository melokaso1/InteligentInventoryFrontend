import type { ChatProductOffer } from '../../types'
import { formatCOP, saleUnitLabel } from '../../utils/format'
import { ProductOfferCarousel } from './ProductOfferCarousel'
import { ProductStockBadge } from './ProductStockBadge'

interface ProductOfferListProps {
  offers: ChatProductOffer[]
  totalCount?: number
  onProductClick?: (offer: ChatProductOffer) => void
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
        ))}
      </ul>
    </div>
  )
}
