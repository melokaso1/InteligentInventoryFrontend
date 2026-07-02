import { useEffect, useMemo, useState } from 'react'
import type { Invoice } from '../types'
import { fetchInvoices, fetchInvoiceStats } from '../api'
import { Icon } from '../components/ui/Icon'
import { formatCOP } from '../utils/format'
import {
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
} from '../components/ui/Pagination'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { StatusBadge } from '../components/ui/StatusBadge'

const keyStatLabels = new Set(['Cuentas por cobrar', 'Importe vencido'])

function InvoicePreviewPanel({
  selected,
  onClose,
}: {
  selected: Invoice
  onClose: () => void
}) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant p-gutter">
        <h4 className="font-headline-sm text-headline-sm text-on-surface">Vista previa</h4>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-2 transition-colors hover:bg-surface-variant"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="flex-1 space-y-lg overflow-y-auto p-gutter">
        <div className="invoice-preview-canvas rounded-xl border border-outline-variant p-xl shadow-sm">
          <div className="mb-xl flex items-start justify-between border-b border-outline-variant pb-md">
            <div>
              <h5 className="text-headline-sm font-bold text-primary">El Plonsazo</h5>
              <p className="text-body-sm text-on-surface-variant">
                Calle del Plonsazo 420
                <br />
                Málaga, 29001
              </p>
            </div>
            <div className="text-right">
              <h6 className="font-label-md uppercase tracking-widest text-on-surface-variant">Factura</h6>
              <p className="font-mono-sm font-bold text-on-surface">{selected.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <table className="mb-lg w-full text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="py-2 text-left">Descripción</th>
                <th className="py-2 text-center">Cant.</th>
                <th className="py-2 text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {selected.lineItems.map((item, i) => (
                <tr key={i} className="border-b border-outline-variant/30">
                  <td className="py-2 text-on-surface">{item.description}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right font-mono-sm">{formatCOP(item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-sm border-t border-outline-variant pt-md text-body-sm">
            <div className="flex justify-between text-on-surface">
              <span>Subtotal</span>
              <span className="font-mono-sm">{formatCOP(selected.subtotal)}</span>
            </div>
            <div className="flex justify-between text-on-surface">
              <span>Impuestos</span>
              <span className="font-mono-sm">{formatCOP(selected.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-headline-sm text-on-surface">
              <span>Total</span>
              <span className="font-mono-sm text-primary">{formatCOP(selected.total)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-sm sm:flex-row">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-sm rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
          >
            <Icon name="download" size={16} />
            Descargar PDF
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-sm rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
          >
            <Icon name="print" size={16} />
            Imprimir
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90"
          >
            <Icon name="send" size={16} />
            Enviar factura
          </button>
        </div>
      </div>
    </>
  )
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [draftCount, setDraftCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [invoicesResult, statsResult] = await Promise.all([
          fetchInvoices({ pageSize: 50 }),
          fetchInvoiceStats(),
        ])
        if (!cancelled) {
          setInvoices(invoicesResult.items)
          setTotalCount(invoicesResult.totalCount)
          setDraftCount(statsResult.draftInvoices)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const invoiceStats = useMemo(() => {
    const receivables = invoices
      .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0)
    const paidThisMonth = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0)
    const overdue = invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0)

    return [
      { label: 'Cuentas por cobrar', value: formatCOP(receivables), tone: 'text-primary' },
      { label: 'Pagado este mes', value: formatCOP(paidThisMonth), tone: 'text-on-primary-container' },
      { label: 'Importe vencido', value: formatCOP(overdue), tone: 'text-error' },
      { label: 'Borradores pendientes', value: String(draftCount), tone: 'text-tertiary' },
    ]
  }, [invoices, draftCount])

  const selected = invoices.find((inv) => inv.id === selectedId)

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
  }

  const invoiceActions = (_row: Invoice) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-all hover:border-primary hover:text-primary"
        title="Descargar PDF"
      >
        <Icon name="download" size={20} />
      </button>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-all hover:border-primary hover:text-primary"
        title="Enviar correo"
      >
        <Icon name="mail" size={20} />
      </button>
    </div>
  )

  const invoiceRowClass = (rowId: string) =>
    `group cursor-pointer transition-colors hover:bg-surface-container-high dark:hover:bg-surface-container ${
      selectedId === rowId && previewOpen
        ? 'bg-primary-container/10 dark:bg-surface-container-high'
        : ''
    }`

  const mobileStats = statsExpanded
    ? invoiceStats
    : invoiceStats.filter((stat) => keyStatLabels.has(stat.label))

  const statCard = (stat: (typeof invoiceStats)[number], compact = false) => (
    <div
      key={stat.label}
      className={`rounded-lg border border-outline-variant bg-surface-container-low ${
        compact ? 'p-2' : 'rounded-xl p-md'
      }`}
    >
      <p
        className={`uppercase tracking-wide text-on-surface-variant ${
          compact ? 'text-[10px] leading-tight font-medium' : 'font-label-md text-label-md'
        }`}
      >
        {stat.label}
      </p>
      <h4
        className={`font-bold ${stat.tone} ${
          compact ? 'mt-0.5 text-sm leading-tight' : 'mt-2 text-headline-md'
        }`}
      >
        {stat.value}
      </h4>
    </div>
  )

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando facturas…
      </div>
    )
  }

  return (
    <div className="relative flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden lg:flex-row lg:overflow-hidden">
      <section
        className={`flex min-w-0 w-full flex-col lg:overflow-hidden border-b border-outline-variant bg-surface transition-[width] duration-300 ease-in-out lg:border-b-0 lg:border-r ${
          previewOpen ? 'lg:w-3/5' : 'lg:w-full'
        }`}
      >
        <div className="flex shrink-0 flex-col gap-sm p-md md:gap-md md:p-gutter">
          <div className="flex items-start justify-between gap-sm">
            <div className="min-w-0 flex-1">
              <h3 className="text-headline-sm font-bold text-on-background md:font-display-lg md:text-display-lg">
                Registro de facturas
              </h3>
              <p className="mt-0.5 hidden text-body-sm text-on-surface-variant md:block">
                Gestiona y supervisa las operaciones de facturación empresarial.
              </p>
            </div>
            <PrimaryActionButton size="sm" className="shrink-0">
              <span className="md:hidden">Nueva</span>
              <span className="hidden md:inline">CREAR NUEVA FACTURA</span>
            </PrimaryActionButton>
          </div>

          <div className="md:hidden">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                Resumen
              </span>
              <button
                type="button"
                onClick={() => setStatsExpanded((open) => !open)}
                className="flex items-center gap-0.5 text-xs font-medium text-primary"
                aria-expanded={statsExpanded}
              >
                {statsExpanded ? 'Ver menos' : 'Ver más'}
                <Icon name={statsExpanded ? 'expand_less' : 'expand_more'} size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mobileStats.map((stat) => statCard(stat, true))}
            </div>
          </div>

          <div className="hidden gap-gutter md:grid md:grid-cols-4">
            {invoiceStats.map((stat) => statCard(stat))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-t border-outline-variant bg-surface-container-lowest md:flex-1 md:overflow-hidden">
          <div className="custom-scrollbar min-w-0 md:flex-1 md:overflow-y-auto">
            <div className="divide-y divide-outline-variant/40 md:hidden">
              {invoices.map((row) => (
                <article
                  key={row.id}
                  onClick={() => handleRowClick(row.id)}
                  className={`p-md ${invoiceRowClass(row.id)}`}
                >
                  <div className="flex items-start justify-between gap-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono-sm font-bold text-primary">{row.id.slice(0, 8).toUpperCase()}</p>
                      <p className="mt-1 truncate font-body-md text-on-surface">{row.client}</p>
                    </div>
                    <StatusBadge variant={row.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-md">
                    <div className="text-body-sm text-on-surface-variant">
                      <span className="font-label-md text-label-md uppercase tracking-wide">
                        Fecha de emisión
                      </span>
                      <p className="mt-0.5 whitespace-nowrap">{row.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">
                        Total adeudado
                      </span>
                      <p className="mt-0.5 whitespace-nowrap font-body-md font-bold text-on-surface">
                        {formatCOP(row.total)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end border-t border-outline-variant/40 pt-3">
                    {invoiceActions(row)}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface-container">
                  <tr>
                    {['Factura #', 'Nombre del cliente', 'Fecha de emisión', 'Total adeudado', 'Estado de pago', 'Acciones'].map(
                      (col, i) => (
                        <th
                          key={col}
                          className={`whitespace-nowrap border-b border-outline-variant px-md py-3 font-label-md text-label-md uppercase text-on-surface-variant ${
                            i === 3 ? 'text-right' : i === 5 ? 'text-center' : ''
                          }`}
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {invoices.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row.id)}
                      className={invoiceRowClass(row.id)}
                    >
                      <td className="whitespace-nowrap px-md py-4 font-mono-sm font-bold text-primary">
                        {row.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-md py-4 font-body-md text-on-surface">{row.client}</td>
                      <td className="whitespace-nowrap px-md py-4 font-body-md text-on-surface-variant">
                        {row.date}
                      </td>
                      <td className="whitespace-nowrap px-md py-4 text-right font-body-md font-bold text-on-surface">
                        {formatCOP(row.total)}
                      </td>
                      <td className="whitespace-nowrap px-md py-4">
                        <StatusBadge variant={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-md py-4">
                        <div className="flex items-center justify-center">{invoiceActions(row)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationFooter>
            <PaginationInfo>
              Mostrando 1-{invoices.length} de {totalCount} facturas
            </PaginationInfo>
            <PaginationControls>
              <PaginationIconButton icon="chevron_left" disabled />
              <PaginationIconButton icon="chevron_right" />
            </PaginationControls>
          </PaginationFooter>
        </div>
      </section>

      <div
        className={`fixed inset-0 z-[100] transition-all duration-300 lg:hidden ${
          previewOpen && selected ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!previewOpen}
      >
        <div
          className={`absolute inset-0 bg-inverse-surface/40 transition-opacity duration-300 ${
            previewOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClosePreview}
          aria-hidden="true"
        />
        <aside
          className={`absolute inset-0 flex flex-col bg-surface-container-low shadow-2xl transition-transform duration-300 ease-in-out ${
            previewOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selected ? <InvoicePreviewPanel selected={selected} onClose={handleClosePreview} /> : null}
        </aside>
      </div>

      <div
        className={`relative hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out lg:block ${
          previewOpen ? 'lg:w-2/5' : 'w-0'
        }`}
        aria-hidden={!previewOpen}
      >
        <aside
          className={`absolute top-0 right-0 flex h-full w-full flex-col bg-surface-container-low transition-transform duration-300 ease-in-out ${
            previewOpen
              ? 'translate-x-0 border-l border-outline-variant'
              : 'pointer-events-none translate-x-full'
          }`}
        >
          {selected ? <InvoicePreviewPanel selected={selected} onClose={handleClosePreview} /> : null}
        </aside>
      </div>
    </div>
  )
}
