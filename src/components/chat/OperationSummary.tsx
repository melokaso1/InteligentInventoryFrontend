import { normalizeChatOperationSummary, type ChatCartLineItem, type ChatOperationSummary } from '../../api'
import type { FulfillmentStatus } from '../../types'
import { formatCOP, saleUnitLabel } from '../../utils/format'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'

interface OperationSummaryProps {
  className?: string
  summary?: ChatOperationSummary | null
  chatState?: string
  invoiceNumber?: string
  fulfillmentStatus?: FulfillmentStatus | null
  onConfirm?: () => void
  onModify?: () => void
  onCancel?: () => void
}

function measureUnitLabel(quantity: number, measureUnit?: string): string {
  const singular = saleUnitLabel(measureUnit)
  if (quantity === 1) return singular
  if (singular === 'unidad') return 'unidades'
  if (singular.endsWith('o')) return `${singular.slice(0, -1)}os`
  return singular
}

function formatQuantity(quantity: number, measureUnit?: string): string {
  const unit = measureUnitLabel(quantity, measureUnit)
  const qtyLabel = Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString('es-CO')
  return `${qtyLabel} ${unit}`
}

function InvoiceLineRowDesktop({ item }: { item: ChatCartLineItem }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px_84px_92px] items-start gap-x-2 border-b border-outline-variant/40 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="line-clamp-1 font-body-md text-body-md leading-snug text-on-surface" title={item.productName}>
          {item.productName}
        </p>
        <p className="mt-0.5 truncate font-mono-sm text-[11px] uppercase tracking-wide text-outline" title={item.productCode}>
          {item.productCode}
        </p>
      </div>
      <p className="whitespace-nowrap pt-0.5 text-center tabular-nums text-body-sm text-on-surface">
        {formatQuantity(item.quantity, item.measureUnit)}
      </p>
      <p className="whitespace-nowrap pt-0.5 text-right font-mono-sm tabular-nums text-body-sm text-on-surface">
        {formatCOP(item.unitPrice)}
      </p>
      <p className="whitespace-nowrap pt-0.5 text-right font-mono-sm tabular-nums text-body-sm font-medium text-on-surface">
        {formatCOP(item.subtotal)}
      </p>
    </div>
  )
}

function InvoiceLineRowMobile({ item }: { item: ChatCartLineItem }) {
  return (
    <div className="flex flex-col gap-xs border-b border-outline-variant/40 py-md last:border-b-0">
      <div className="min-w-0">
        <p className="line-clamp-2 font-body-md text-body-md leading-snug text-on-surface">{item.productName}</p>
        <p className="mt-0.5 truncate font-mono-sm text-[11px] uppercase tracking-wide text-outline">
          {item.productCode}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-sm gap-y-xs text-body-sm">
        <span className="text-on-surface-variant">Cantidad</span>
        <span className="text-right tabular-nums text-on-surface">
          {formatQuantity(item.quantity, item.measureUnit)}
        </span>
        <span className="text-on-surface-variant">P. unitario</span>
        <span className="text-right font-mono-sm tabular-nums text-on-surface">
          {formatCOP(item.unitPrice)}
        </span>
      </div>
      <div className="mt-xs flex items-baseline justify-between rounded bg-surface-container-highest px-sm py-xs">
        <span className="text-[11px] font-bold uppercase tracking-wide text-outline">Subtotal línea</span>
        <span className="font-mono-sm text-body-md tabular-nums font-medium text-on-surface">
          {formatCOP(item.subtotal)}
        </span>
      </div>
    </div>
  )
}

export function OperationSummary({
  className = '',
  summary: rawSummary,
  chatState = 'idle',
  invoiceNumber,
  fulfillmentStatus,
  onConfirm,
  onModify,
  onCancel,
}: OperationSummaryProps) {
  const summary = normalizeChatOperationSummary(rawSummary)
  const lineItems = summary?.lineItems ?? []
  const hasSummary = lineItems.length > 0

  return (
    <aside
      className={`flex min-w-0 w-full flex-col overflow-y-auto overflow-x-hidden border-outline-variant bg-surface-container p-lg lg:w-[420px] lg:shrink-0 lg:border-l ${className}`}
    >
      <div className="flex flex-col gap-lg">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Resumen de operación</h2>
            <p className="break-all font-body-sm text-body-sm text-on-surface-variant">
              {summary?.transactionId
                ? `ID de transacción: ${summary.transactionId}`
                : 'Sin transacción en curso'}
            </p>
            {invoiceNumber && (
              <p className="mt-xs font-mono-sm text-xs text-primary">Factura: {invoiceNumber}</p>
            )}
            {(chatState === 'sale_completed' || summary?.status === 'completed') && fulfillmentStatus && (
              <div className="mt-sm">
                <StatusBadge variant={fulfillmentStatus} />
              </div>
            )}
          </div>
          <span className="shrink-0 rounded border border-outline-variant bg-surface-container-highest px-sm py-1 font-mono-sm text-[11px] text-on-surface-variant">
            v2.4.1
          </span>
        </div>

        {hasSummary && summary ? (
          <>
            <div className="flex flex-col gap-md">
              <div className="rounded border border-outline-variant bg-surface-container-low shadow-sm">
                <div className="border-b border-outline-variant px-md py-sm">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    {lineItems.length === 1 ? '1 producto' : `${lineItems.length} productos`}
                  </p>
                </div>

                <div className="custom-scrollbar max-h-[min(320px,40vh)] overflow-y-auto px-md">
                  <div className="hidden sm:block">
                    <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_72px_84px_92px] gap-x-2 border-b border-outline-variant bg-surface-container-low py-2 text-[11px] font-bold uppercase tracking-wide text-outline">
                      <span>Descripción</span>
                      <span className="text-center">Cant.</span>
                      <span className="text-right">P. unit.</span>
                      <span className="text-right">Subtotal</span>
                    </div>
                    {lineItems.map((item, index) => (
                      <InvoiceLineRowDesktop key={`${item.productCode}-${index}`} item={item} />
                    ))}
                  </div>

                  <div className="sm:hidden">
                    {lineItems.map((item, index) => (
                      <InvoiceLineRowMobile key={`${item.productCode}-mobile-${index}`} item={item} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-sm rounded border border-outline-variant bg-surface-container-highest p-md">
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>{lineItems.length > 1 ? 'Subtotal carrito' : 'Subtotal'}</span>
                  <span className="font-mono-sm tabular-nums text-on-surface">{formatCOP(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>Impuestos</span>
                  <span className="font-mono-sm tabular-nums text-on-surface">{formatCOP(summary.tax)}</span>
                </div>
                <div className="my-xs h-px bg-outline-variant" />
                <div className="flex items-end justify-between gap-sm">
                  <span className="font-bold text-on-surface">Importe total</span>
                  <span className="font-display-lg text-display-lg tabular-nums text-primary">
                    {formatCOP(summary.total)}
                  </span>
                </div>
              </div>
            </div>

            {chatState === 'awaiting_confirmation' && (
              <div className="flex flex-col gap-sm">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex w-full items-center justify-center gap-md rounded bg-primary py-lg font-headline-sm text-headline-sm text-on-primary shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <Icon name="verified" />
                  Confirmar compra
                </button>
                <div className="flex gap-sm">
                  <button
                    type="button"
                    onClick={onModify}
                    className="flex-1 rounded border border-outline-variant bg-surface-container-high py-md font-label-md text-label-md text-on-surface transition-all hover:bg-surface-bright"
                  >
                    Modificar pedido
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded border border-error py-md font-label-md text-label-md text-error transition-all hover:bg-error/10"
                  >
                    Cancelar pedido
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-lg text-center">
            <Icon name="shopping_bag" size={40} className="mx-auto mb-md text-outline" />
            <p className="font-body-md text-on-surface-variant">
              Inicia una consulta o compra en el chat para ver el resumen aquí.
            </p>
          </div>
        )}

        <div className="flex gap-sm rounded border border-dashed border-outline-variant bg-surface-container-lowest p-md">
          <Icon name="info" className="text-sm text-outline" />
          <p className="text-[12px] leading-relaxed text-on-surface-variant">
            Al confirmar, aceptas los Términos de venta empresariales. Esta cotización queda bloqueada mientras
            el stock permanezca asignado.
          </p>
        </div>
      </div>
    </aside>
  )
}
