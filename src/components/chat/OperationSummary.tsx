import type { ChatOperationSummary } from '../../api'
import { formatCOP } from '../../utils/format'
import { Icon } from '../ui/Icon'

interface OperationSummaryProps {
  className?: string
  summary?: ChatOperationSummary | null
  chatState?: string
  invoiceNumber?: string
  onConfirm?: () => void
  onModify?: () => void
  onCancel?: () => void
}

function statusDisplay(status: string, state: string) {
  if (state === 'sale_completed' || status === 'completed') {
    return { label: 'Compra completada', tone: 'text-primary', pulse: false }
  }
  if (state === 'awaiting_confirmation' || status === 'pending_confirmation') {
    return { label: 'Pendiente de confirmación', tone: 'text-error', pulse: true }
  }
  if (state === 'awaiting_quantity') {
    return { label: 'Esperando cantidad', tone: 'text-on-surface-variant', pulse: false }
  }
  return { label: 'Sin operación activa', tone: 'text-on-surface-variant', pulse: false }
}

export function OperationSummary({
  className = '',
  summary,
  chatState = 'idle',
  invoiceNumber,
  onConfirm,
  onModify,
  onCancel,
}: OperationSummaryProps) {
  const status = summary ? statusDisplay(summary.status, chatState) : statusDisplay('', chatState)
  const hasSummary = Boolean(summary && summary.productName)

  return (
    <aside
      className={`flex min-w-0 w-full flex-col overflow-y-auto overflow-x-hidden border-outline-variant bg-surface-container p-lg lg:w-[400px] lg:shrink-0 lg:border-l ${className}`}
    >
      <div className="flex flex-col gap-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Resumen de operación</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {summary?.transactionId
                ? `ID de transacción: ${summary.transactionId}`
                : 'Sin transacción en curso'}
            </p>
            {invoiceNumber && (
              <p className="mt-xs font-mono-sm text-xs text-primary">Factura: {invoiceNumber}</p>
            )}
          </div>
          <span className="rounded border border-outline-variant bg-surface-container-highest px-sm py-1 font-mono-sm text-[11px] text-on-surface-variant">
            v2.4.1
          </span>
        </div>

        {hasSummary ? (
          <>
            <div className="flex min-w-0 items-center justify-between rounded border border-outline-variant bg-surface-container-low p-md">
              <div className="flex min-w-0 items-center gap-sm">
                {status.pulse && (
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-error" />
                  </span>
                )}
                <span className={`truncate font-label-md text-label-md uppercase tracking-wider ${status.tone}`}>
                  {status.label}
                </span>
              </div>
              <Icon name="history" className="shrink-0 text-outline" />
            </div>

            <div className="flex flex-col gap-md">
              <div className="flex flex-col gap-md rounded border border-outline-variant bg-surface-container-low p-md shadow-sm">
                <div className="flex gap-md">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface-container">
                    <Icon name="inventory_2" size={32} className="text-on-surface-variant" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-headline-sm text-headline-sm leading-tight text-on-surface">
                      {summary!.productName}
                    </h3>
                    <p className="font-mono-sm text-[12px] uppercase text-outline">
                      SKU: {summary!.productCode}
                    </p>
                    <div className="mt-sm flex items-center gap-xs">
                      <Icon name="check_circle" filled size={14} className="text-primary" />
                      <span className="font-label-md text-label-md text-primary">Stock validado</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-sm border-t border-outline-variant pt-md">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-outline">Cantidad</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      {summary!.quantity}{' '}
                      <span className="text-body-sm font-normal text-on-surface-variant">unidades</span>
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold uppercase text-outline">Precio unitario</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      {formatCOP(summary!.unitPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-sm rounded border border-outline-variant bg-surface-container-highest p-md">
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="text-on-surface">{formatCOP(summary!.subtotal)}</span>
                </div>
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>Impuestos</span>
                  <span className="text-on-surface">{formatCOP(summary!.tax)}</span>
                </div>
                <div className="my-xs h-px bg-outline-variant" />
                <div className="flex items-end justify-between">
                  <span className="font-bold text-on-surface">Importe total</span>
                  <span className="font-display-lg text-display-lg text-primary">
                    {formatCOP(summary!.total)}
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
