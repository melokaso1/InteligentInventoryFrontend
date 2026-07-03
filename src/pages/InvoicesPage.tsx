import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { Invoice } from '../types'
import { fetchInvoicePdf, fetchInvoices, fetchInvoiceStats, payInvoice } from '../api'
import { getUserFacingApiError } from '../api/client'
import { canPayInvoice, PayInvoiceModal, type PaymentMethod } from '../components/invoices/PayInvoiceModal'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { formatCOP, formatDate } from '../utils/format'
import { downloadBlob } from '../utils/download'
import {
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
} from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Toast } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'
import { useOverlayLock } from '../hooks/useOverlayLock'
import { notifyDataMutation } from '../utils/dataSync'

const keyStatLabels = new Set(['Cuentas por cobrar', 'Importe vencido'])

function normalizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

function invoiceDownloadFilename(invoice: Invoice, serverFilename?: string) {
  if (serverFilename) {
    const withoutExtension = serverFilename.replace(/\.(pdf|txt)$/i, '')
    return `${withoutExtension}.txt`
  }

  const clientPart = normalizeFilenamePart(invoice.client) || 'cliente'
  return `factura-${clientPart}-${invoice.id.slice(0, 8).toLowerCase()}.txt`
}

function invoiceMailto(to: string, invoice: Invoice) {
  const subject = `Factura ${invoice.id.slice(0, 8).toUpperCase()} - ${invoice.client}`
  const body = [
    `Hola,`,
    ``,
    `Adjunto encontrarás la factura ${invoice.id.slice(0, 8).toUpperCase()}.`,
    ``,
    `Cliente: ${invoice.client}`,
    `Fecha de emisión: ${formatDate(invoice.date)}`,
    `Fecha de vencimiento: ${formatDate(invoice.dueDate)}`,
    `Total: ${formatCOP(invoice.total)}`,
    ``,
    `Nota: ${invoice.billingNote}`,
    ``,
    `Gracias.`,
  ].join('\n')

  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function InvoicePreviewPanel({
  selected,
  onClose,
  onDownloadSuccess,
  onPay,
  onSend,
  paying,
}: {
  selected: Invoice
  onClose: () => void
  onDownloadSuccess?: (filename: string) => void
  onPay?: () => void
  onSend?: () => void
  paying?: boolean
}) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleDownload = async () => {
    setDownloadLoading(true)
    setActionError(null)
    try {
      const { blob, filename } = await fetchInvoicePdf(selected.id)
      if (blob.size === 0) {
        throw new Error('El archivo de factura está vacío.')
      }
      const downloadName = invoiceDownloadFilename(selected, filename)
      downloadBlob(blob, downloadName)
      onDownloadSuccess?.(downloadName)
    } catch (err) {
      setActionError(getUserFacingApiError(err, 'No se pudo descargar la factura.'))
    } finally {
      setDownloadLoading(false)
    }
  }

  const handlePrint = () => {
    const preview = previewRef.current
    if (!preview) return

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      setActionError('No se pudo abrir la ventana de impresión.')
      return
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Factura ${selected.id.slice(0, 8).toUpperCase()}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      color: #1a1a1a;
      margin: 0;
      padding: 1.25rem;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; table-layout: fixed; }
    th, td { padding: 0.5rem 0.25rem; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
    th { text-align: left; color: #666; font-weight: 600; }
    .totals { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd; }
    .totals div { display: flex; justify-content: space-between; margin: 0.25rem 0; }
    .total-row { font-weight: bold; font-size: 1.1rem; }
    @media print {
      @page { margin: 1.5cm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>${preview.innerHTML}</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleSend = () => {
    onSend?.()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-md py-md md:px-lg">
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
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-md md:p-lg">
        <div
          ref={previewRef}
          className="invoice-preview-canvas rounded-xl border border-outline-variant p-md pb-md shadow-sm md:p-lg md:pb-lg"
        >
          <div className="mb-lg flex min-w-0 items-start justify-between gap-md border-b border-outline-variant pb-md md:mb-xl">
            <div className="min-w-0 flex-1">
              <h5 className="text-headline-sm font-bold text-primary">El Plonsazo</h5>
              <p className="text-body-sm text-on-surface-variant">
                Calle del Plonsazo 420
                <br />
                Málaga, 29001
              </p>
              <p className="mt-sm text-body-sm text-on-surface-variant">
                Emisión: {formatDate(selected.date)}
                <br />
                Vencimiento: {formatDate(selected.dueDate)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <h6 className="font-label-md uppercase tracking-widest text-on-surface-variant">Factura</h6>
              <p className="font-mono-sm font-bold text-on-surface">{selected.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <div className="invoice-preview-line-items mb-lg">
            <table className="w-full min-w-0 text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="w-[50%] py-2 text-left">Descripción</th>
                  <th className="w-[20%] py-2 text-center">Cant.</th>
                  <th className="w-[30%] py-2 text-right">Precio</th>
                </tr>
              </thead>
              <tbody>
                {selected.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/30">
                    <td className="py-2 text-on-surface">{item.description}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="whitespace-nowrap py-2 text-right font-mono-sm">{formatCOP(item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-sm border-t border-outline-variant pt-md pb-sm text-body-sm">
            <div className="flex justify-between gap-md text-on-surface">
              <span>Subtotal</span>
              <span className="shrink-0 font-mono-sm">{formatCOP(selected.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-md text-on-surface">
              <span>Impuestos</span>
              <span className="shrink-0 font-mono-sm">{formatCOP(selected.tax)}</span>
            </div>
            <div className="flex justify-between gap-md font-bold text-headline-sm text-on-surface">
              <span>Total</span>
              <span className="shrink-0 font-mono-sm text-primary">{formatCOP(selected.total)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-outline-variant p-md pb-[max(1rem,env(safe-area-inset-bottom))] md:p-lg md:pb-lg">
        <div className="flex flex-col gap-md sm:flex-row sm:flex-wrap">
          {canPayInvoice(selected) && onPay ? (
            <button
              type="button"
              onClick={onPay}
              disabled={paying || downloadLoading}
              className="inline-flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="payments" size={16} className="shrink-0" />
              {paying ? 'Procesando…' : 'Marcar como pagada'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloadLoading}
            className="inline-flex flex-1 items-center justify-center gap-sm rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="download" size={16} className="shrink-0" />
            {downloadLoading ? 'Descargando…' : 'Descargar factura'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={downloadLoading}
            className="inline-flex flex-1 items-center justify-center gap-sm rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="print" size={16} className="shrink-0" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={downloadLoading}
            className="inline-flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="send" size={16} className="shrink-0" />
            Enviar factura
          </button>
        </div>
        {actionError ? (
          <p className="mt-md text-body-sm text-error" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function InvoicesPage() {
  const { toastMessage, showToast, dismissToast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [draftCount, setDraftCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const [rowDownloadId, setRowDownloadId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailInvoiceId, setEmailInvoiceId] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payInvoiceTarget, setPayInvoiceTarget] = useState<Invoice | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const isInitialLoad = useRef(true)

  const reloadInvoices = useCallback(async () => {
    const [invoicesResult, statsResult] = await Promise.all([fetchInvoices({ pageSize: 50 }), fetchInvoiceStats()])
    setInvoices(invoicesResult.items)
    setTotalCount(invoicesResult.totalCount)
    setDraftCount(statsResult.draftInvoices)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (!cancelled) await reloadInvoices()
      } finally {
        if (!cancelled && isInitialLoad.current) {
          isInitialLoad.current = false
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [reloadInvoices])

  useRealtimeRefresh(reloadInvoices, [reloadInvoices], { scope: ['invoices', 'sales'] })

  useOverlayLock(previewOpen, 'invoice-preview')

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

  const openEmailModal = (invoice: Invoice) => {
    setEmailInvoiceId(invoice.id)
    setEmailTo('')
    setEmailError(null)
    setEmailModalOpen(true)
  }

  const closeEmailModal = () => {
    setEmailModalOpen(false)
  }

  const submitEmail = () => {
    const invoice = invoices.find((inv) => inv.id === emailInvoiceId)
    const to = emailTo.trim()

    if (!invoice) {
      setEmailError('No se encontró la factura seleccionada.')
      return
    }

    if (!to) {
      setEmailError('Ingresa un correo de destino.')
      return
    }

    const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
    if (!looksValid) {
      setEmailError('El correo no parece válido.')
      return
    }

    setEmailError(null)
    window.location.href = invoiceMailto(to, invoice)
    setEmailModalOpen(false)
    showToast('Se abrió tu cliente de correo. Adjunta la factura descargada si aún no lo hiciste.')
  }

  const showDownloadSuccess = (filename: string) => {
    setDownloadError(null)
    setDownloadSuccess(`Factura descargada: ${filename}`)
    window.setTimeout(() => setDownloadSuccess(null), 4000)
  }

  const downloadInvoice = async (invoice: Invoice) => {
    if (rowDownloadId) return
    setRowDownloadId(invoice.id)
    setDownloadError(null)
    try {
      const { blob, filename } = await fetchInvoicePdf(invoice.id)
      if (blob.size === 0) {
        throw new Error('El archivo de factura está vacío.')
      }
      const downloadName = invoiceDownloadFilename(invoice, filename)
      downloadBlob(blob, downloadName)
      showDownloadSuccess(downloadName)
    } catch (err) {
      setDownloadError(getUserFacingApiError(err, 'No se pudo descargar la factura.'))
    } finally {
      setRowDownloadId(null)
    }
  }

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
  }

  const openPayModal = (invoice: Invoice) => {
    setPayInvoiceTarget(invoice)
    setPayModalOpen(true)
  }

  const closePayModal = () => {
    setPayModalOpen(false)
    setPayInvoiceTarget(null)
  }

  const handlePayInvoice = async (paymentMethod: PaymentMethod) => {
    if (!payInvoiceTarget) return

    setPayingId(payInvoiceTarget.id)
    try {
      await payInvoice(payInvoiceTarget.id, paymentMethod)
      await reloadInvoices()
      notifyDataMutation('invoices')
      notifyDataMutation('sales')
      notifyDataMutation('dashboard')
      notifyDataMutation('orders')
      notifyDataMutation('inventory')
      closePayModal()
      showToast('Factura marcada como pagada. El pedido pasará a preparación en Despacho.')
    } finally {
      setPayingId(null)
    }
  }

  const invoiceActions = (row: Invoice) => (
    <div className="flex items-center gap-2" aria-label="Acciones">
      {canPayInvoice(row) ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openPayModal(row)
          }}
          disabled={payingId === row.id}
          className="rounded-lg border border-primary/40 bg-primary/10 p-2 text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          title="Marcar como pagada"
        >
          <Icon name="payments" size={20} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void downloadInvoice(row)
        }}
        disabled={rowDownloadId === row.id}
        className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        title={rowDownloadId === row.id ? 'Descargando…' : 'Descargar factura'}
      >
        <Icon name="download" size={20} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          openEmailModal(row)
        }}
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
      <Toast message={toastMessage} onDismiss={dismissToast} className="absolute left-md right-md top-md z-[110]" />
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
          </div>

          {downloadError ? (
            <p className="rounded-lg border border-error/30 bg-error/10 px-md py-sm text-body-sm text-error" role="alert">
              {downloadError}
            </p>
          ) : null}

          {downloadSuccess ? (
            <p className="rounded-lg border border-primary/30 bg-primary-container/20 px-md py-sm text-body-sm text-on-surface" role="status">
              {downloadSuccess}
            </p>
          ) : null}

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
                      <p className="mt-0.5 whitespace-nowrap">{formatDate(row.date)}</p>
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
              <table className="w-full min-w-[800px] border-collapse text-left">
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-surface-container">
                  <tr>
                    {(
                      [
                        { label: 'Factura #', align: '' },
                        { label: 'Nombre del cliente', align: '' },
                        { label: 'Fecha de emisión', align: '' },
                        { label: 'Total adeudado', align: 'text-right', title: 'Total adeudado' },
                        { label: 'Estado', align: '', title: 'Estado de pago' },
                        { label: 'Acciones', align: 'text-center' },
                      ] as const
                    ).map((col) => (
                      <th
                        key={col.label}
                        title={'title' in col ? col.title : undefined}
                        className={`whitespace-nowrap border-b border-outline-variant px-gutter py-3 font-label-md text-label-md uppercase text-on-surface-variant ${col.align}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {invoices.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row.id)}
                      className={invoiceRowClass(row.id)}
                    >
                      <td className="whitespace-nowrap px-gutter py-4 font-mono-sm font-bold text-primary">
                        {row.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-gutter py-4 font-body-md text-on-surface">{row.client}</td>
                      <td className="whitespace-nowrap px-gutter py-4 font-body-md text-on-surface-variant">
                        {formatDate(row.date)}
                      </td>
                      <td className="whitespace-nowrap px-gutter py-4 text-right font-body-md font-bold text-on-surface">
                        {formatCOP(row.total)}
                      </td>
                      <td className="whitespace-nowrap px-gutter py-4">
                        <StatusBadge variant={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-gutter py-4">
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
          className={`absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-surface-container-low shadow-2xl transition-transform duration-300 ease-in-out ${
            previewOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selected ? (
            <InvoicePreviewPanel
              selected={selected}
              onClose={handleClosePreview}
              onDownloadSuccess={showDownloadSuccess}
              onPay={canPayInvoice(selected) ? () => openPayModal(selected) : undefined}
              onSend={() => openEmailModal(selected)}
              paying={payingId === selected.id}
            />
          ) : null}
        </aside>
      </div>

      <div
        className={`relative hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out lg:block ${
          previewOpen ? 'lg:w-2/5' : 'w-0'
        }`}
        aria-hidden={!previewOpen}
      >
        <aside
          className={`absolute top-0 right-0 flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface-container-low transition-transform duration-300 ease-in-out ${
            previewOpen
              ? 'translate-x-0 border-l border-outline-variant'
              : 'pointer-events-none translate-x-full'
          }`}
        >
          {selected ? (
            <InvoicePreviewPanel
              selected={selected}
              onClose={handleClosePreview}
              onDownloadSuccess={showDownloadSuccess}
              onPay={canPayInvoice(selected) ? () => openPayModal(selected) : undefined}
              onSend={() => openEmailModal(selected)}
              paying={payingId === selected.id}
            />
          ) : null}
        </aside>
      </div>

      <Modal
        open={emailModalOpen}
        onClose={closeEmailModal}
        title="Enviar factura por correo"
        icon="mail"
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={closeEmailModal}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitEmail}
              className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90"
            >
              Abrir correo
            </button>
          </div>
        }
      >
        <div className="space-y-sm">
          <p className="text-body-sm text-on-surface-variant">
            Este taller usa un envío simple vía <span className="font-mono">mailto:</span> (se abrirá tu cliente de correo).
          </p>
          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Correo destino</span>
            <input
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
              placeholder="cliente@correo.com"
              inputMode="email"
              autoComplete="email"
            />
          </label>
          {emailError ? (
            <p className="text-body-sm text-error" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>
      </Modal>

      <PayInvoiceModal
        open={payModalOpen}
        invoice={payInvoiceTarget}
        onClose={closePayModal}
        onConfirm={handlePayInvoice}
        adminMode
      />
    </div>
  )
}
