import type { ChatProductOffer } from '../../types'

import { formatCOP, saleUnitLabel } from '../../utils/format'

import { StatusBadge } from '../ui/StatusBadge'



interface ProductOfferListProps {

  offers: ChatProductOffer[]

  totalCount?: number

  onLoadMore?: () => void

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



export function ProductOfferList({ offers, totalCount, onLoadMore }: ProductOfferListProps) {

  if (offers.length === 0) return null



  const total = totalCount ?? offers.length

  const hasMore = total > offers.length



  return (

    <div className="mt-sm flex flex-col gap-sm">

      <ul

        className={`flex flex-col gap-sm ${offers.length > 6 ? 'max-h-80 overflow-y-auto pr-1' : ''}`}

      >

        {offers.map((offer) => (

          <li

            key={offer.productCode}

            className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-sm"

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

          </li>

        ))}

      </ul>

      {hasMore && (

        <div className="flex flex-col items-start gap-xs">

          <p className="font-body-sm text-body-sm text-on-surface-variant">

            Mostrando {offers.length} de {total} productos.

          </p>

          {onLoadMore && (

            <button

              type="button"

              onClick={onLoadMore}

              className="rounded border border-outline-variant bg-surface-container-high px-md py-sm font-label-md text-label-md text-on-surface transition-all hover:bg-surface-bright active:scale-95"

            >

              Cargar más

            </button>

          )}

        </div>

      )}

    </div>

  )

}

