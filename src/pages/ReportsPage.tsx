import { useState } from 'react'
import { fetchInventory, fetchSales } from '../api'
import { ApiError } from '../api/client'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'

type ReportType = 'ventas' | 'inventario'

function escapeCsvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}\-_]+/gu, '-').replace(/-+/g, '-').slice(0, 60) || 'informe'
}

export function ReportsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [reportName, setReportName] = useState('')
  const [reportType, setReportType] = useState<ReportType>('ventas')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [generating, setGenerating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const openModal = () => {
    setReportName('')
    setReportType('ventas')
    setFormError(null)
    setModalOpen(true)
  }

  const handleGenerate = async () => {
    const name = reportName.trim()
    if (!name) {
      setFormError('Ingresa un nombre para el informe.')
      return
    }
    if (fromDate > toDate) {
      setFormError('La fecha inicial no puede ser posterior a la final.')
      return
    }

    setFormError(null)
    setGenerating(true)
    try {
      const baseName = sanitizeFilename(name)
      const dateSuffix = `${fromDate}_${toDate}`

      if (reportType === 'ventas') {
        const result = await fetchSales({ from: fromDate, to: toDate, pageSize: 500 })
        const filename = `${baseName}-ventas-${dateSuffix}.csv`
        downloadCsv(
          filename,
          ['ID', 'Cliente', 'Correo', 'Origen', 'Fecha', 'Total', 'Estado'],
          result.items.map((sale) => [
            sale.id,
            sale.customer,
            sale.email,
            sale.origin,
            sale.date,
            sale.total,
            sale.status,
          ]),
        )
        setSuccessMessage(`Informe descargado: ${filename}`)
      } else {
        const result = await fetchInventory({ pageSize: 500 })
        const filename = `${baseName}-inventario-${dateSuffix}.csv`
        downloadCsv(
          filename,
          ['SKU', 'Producto', 'Categoría', 'Almacén', 'Cantidad', 'Precio unitario', 'Nivel stock'],
          result.items.map((item) => [
            item.sku,
            item.name,
            item.category,
            item.warehouse,
            item.quantity,
            item.unitPrice,
            item.stockLevel,
          ]),
        )
        setSuccessMessage(`Informe descargado: ${filename}`)
      }

      setModalOpen(false)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo generar el informe.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Informes</h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            Genera y exporta reportes del sistema en formato CSV.
          </p>
        </div>
        <PrimaryActionButton size="compact" onClick={openModal}>
          Nuevo informe personalizado
        </PrimaryActionButton>
      </div>

      {successMessage ? (
        <p className="rounded-lg border border-primary/30 bg-primary-container/20 px-md py-sm text-body-sm text-on-surface" role="status">
          {successMessage}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
        {[
          { label: 'Informes generados', value: '0', icon: 'description', color: 'text-primary' },
          { label: 'Descargas este mes', value: '0', icon: 'download', color: 'text-primary-dim' },
          { label: 'Programados', value: '0', icon: 'schedule', color: 'text-tertiary' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm"
          >
            <div className={`rounded-lg bg-primary/10 p-sm ${stat.color}`}>
              <Icon name={stat.icon} />
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">{stat.label}</p>
              <p className="font-display-lg text-display-lg">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
          <h2 className="font-headline-sm text-headline-sm">Informes disponibles</h2>
        </div>
        <div className="flex flex-col items-center justify-center px-lg py-2xl text-center">
          <Icon name="description" size={48} className="mb-md text-outline" />
          <p className="font-body-md text-on-surface-variant">
            Usa &quot;Nuevo informe personalizado&quot; para exportar datos de ventas o inventario.
          </p>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => !generating && setModalOpen(false)}
        title="Nuevo informe personalizado"
        icon="description"
        footer={
          <div className="flex flex-col gap-md">
            {formError ? (
              <p className="text-body-sm text-error" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex gap-md">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={generating}
                className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary disabled:opacity-50"
              >
                {generating ? 'Generando…' : 'Exportar CSV'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-md">
          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Nombre del informe</span>
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
              placeholder="Ej. Ventas Q1"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Tipo</span>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none"
            >
              <option value="ventas">Ventas</option>
              <option value="inventario">Inventario</option>
            </Select>
          </label>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">Desde</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">Hasta</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
