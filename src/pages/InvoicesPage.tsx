import { useEffect, useMemo, useRef, useState } from 'react'
import type { Invoice } from '../types'
import { createInvoice, fetchInvoicePdf, fetchInvoices, fetchInvoiceStats } from '../api'
import { Icon } from '../components/ui/Icon'
import { Drawer } from '../components/ui/Drawer'
import { Modal } from '../components/ui/Modal'
import { formatCOP, formatDate } from '../utils/format'
import {
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
} from '../components/ui/Pagination'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { StatusBadge } from '../components/ui/StatusBadge'

const keyStatLabels = new Set(['Cuentas por cobrar', 'Importe vencido'])

function normalizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
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
}: {
  selected: Invoice
  onClose: () => void
}) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    setActionError(null)
    try {
      const { blob, filename } = await fetchInvoicePdf(selected.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo descargar el PDF.')
    } finally {
      setPdfLoading(false)
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
  <title>Factura ${selected.id.slice(0, 8).toUpperCase()}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1a1a1a; padding: 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { padding: 0.5rem 0; border-bottom: 1px solid #ddd; }
    th { text-align: left; color: #666; font-weight: 600; }
    .totals { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #ddd; }
    .totals div { display: flex; justify-content: space-between; margin: 0.25rem 0; }
    .total-row { font-weight: bold; font-size: 1.1rem; }
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
    alert('Función de envío simulada')
  }

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
        <div
          ref={previewRef}
          className="invoice-preview-canvas rounded-xl border border-outline-variant p-xl shadow-sm"
        >
          <div className="mb-xl flex items-start justify-between border-b border-outline-variant pb-md">
            <div>
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
            onClick={() => void handleDownloadPdf()}
            disabled={pdfLoading}
            className="flex flex-1 items-center justify-center gap-sm rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="download" size={16} />
            {pdfLoading ? 'Descargando…' : 'Descargar PDF'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={pdfLoading}
            className="flex flex-1 items-center justify-center gap-sm rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="print" size={16} />
            Imprimir
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={pdfLoading}
            className="flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="send" size={16} />
            Enviar factura
          </button>
        </div>
        {actionError ? (
          <p className="text-body-sm text-error" role="alert">
            {actionError}
          </p>
        ) : null}
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
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    client: '',
    billingNote: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    lineDescription: '',
    quantity: 1,
    unitPrice: 0,
  })
  const [rowDownloadId, setRowDownloadId] = useState<string | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailInvoiceId, setEmailInvoiceId] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

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

  const reloadInvoices = async () => {
    const [invoicesResult, statsResult] = await Promise.all([fetchInvoices({ pageSize: 50 }), fetchInvoiceStats()])
    setInvoices(invoicesResult.items)
    setTotalCount(invoicesResult.totalCount)
    setDraftCount(statsResult.draftInvoices)
  }

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
  }

  const downloadInvoicePdf = async (invoice: Invoice) => {
    if (rowDownloadId) return
    setRowDownloadId(invoice.id)
    try {
      const { blob, filename } = await fetchInvoicePdf(invoice.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        filename ||
        `factura-${normalizeFilenamePart(invoice.client) || 'cliente'}-${invoice.id.slice(0, 8).toLowerCase()}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo descargar el PDF.')
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

  const openCreateDrawer = () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const dueStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    setCreateForm({
      client: '',
      billingNote: '',
      date: todayStr,
      dueDate: dueStr,
      lineDescription: '',
      quantity: 1,
      unitPrice: 0,
    })
    setCreateFormError(null)
    setCreateDrawerOpen(true)
    setPreviewOpen(false)
  }

  const closeCreateDrawer = () => {
    if (creatingInvoice) return
    setCreateDrawerOpen(false)
    setCreateFormError(null)
  }

  const handleCreateInvoice = async () => {
    if (creatingInvoice) return

    const client = createForm.client.trim()
    const lineDescription = createForm.lineDescription.trim()
    if (!client) {
      setCreateFormError('Ingresa el nombre del cliente.')
      return
    }
    if (!lineDescription) {
      setCreateFormError('Ingresa la descripción del item.')
      return
    }

    setCreateFormError(null)
    setCreatingInvoice(true)
    try {
      const created = await createInvoice({
        client,
        billingNote: createForm.billingNote.trim(),
        date: createForm.date,
        dueDate: createForm.dueDate,
        lineItems: [
          {
            description: lineDescription,
            quantity: Math.max(1, createForm.quantity),
            unitPrice: Math.max(0, createForm.unitPrice),
          },
        ],
      })

      await reloadInvoices()
      setSelectedId(created.id)
      setPreviewOpen(true)
      closeCreateDrawer()
    } catch (err) {
      setCreateFormError(err instanceof Error ? err.message : 'No se pudo crear la factura.')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const invoiceActions = (row: Invoice) => (
    <div className="flex items-center gap-2" aria-label="Acciones">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void downloadInvoicePdf(row)
        }}
        disabled={rowDownloadId === row.id}
        className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        title={rowDownloadId === row.id ? 'Descargando…' : 'Descargar PDF'}
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
            <PrimaryActionButton size="default" className="shrink-0" onClick={openCreateDrawer} disabled={creatingInvoice}>
              <span className="md:hidden">NUEVA FACTURA</span>
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
                        {formatDate(row.date)}
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

      <Drawer
        open={createDrawerOpen}
        onClose={closeCreateDrawer}
        title="Crear nueva factura"
        subtitle="Nueva factura standalone"
        footer={
          <div className="flex flex-col gap-md">
            {createFormError ? (
              <p className="text-body-sm text-error" role="alert">
                {createFormError}
              </p>
            ) : null}
            <div className="flex gap-md">
              <button
                type="button"
                onClick={closeCreateDrawer}
                disabled={creatingInvoice}
                className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreateInvoice()}
                disabled={creatingInvoice}
                className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary disabled:opacity-50"
              >
                {creatingInvoice ? 'Creando…' : 'Crear factura'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-lg">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">Cliente</label>
              <input
                value={createForm.client}
                onChange={(e) => setCreateForm((f) => ({ ...f, client: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">Fecha</label>
              <input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">Vencimiento</label>
              <input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">Cantidad</label>
              <input
                type="number"
                min={1}
                value={createForm.quantity}
                onChange={(e) => setCreateForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">Item</label>
            <div className="mt-1 grid grid-cols-1 gap-md sm:grid-cols-[1fr_160px_160px]">
              <input
                value={createForm.lineDescription}
                onChange={(e) => setCreateForm((f) => ({ ...f, lineDescription: e.target.value }))}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Descripción del servicio"
              />
              <input
                type="number"
                min={0}
                value={createForm.unitPrice}
                onChange={(e) => setCreateForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Precio unitario"
              />
              <div className="flex items-end pb-1">
                <span className="text-xs font-semibold text-on-surface-variant">COP</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-on-surface-variant">Nota</label>
            <textarea
              value={createForm.billingNote}
              onChange={(e) => setCreateForm((f) => ({ ...f, billingNote: e.target.value }))}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </Drawer>

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
    </div>
  )
}
