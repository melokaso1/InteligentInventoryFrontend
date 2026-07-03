import { useMemo, useState } from 'react'
import { fetchInventory, fetchSales } from '../api'
import { getUserFacingApiError } from '../api/client'
import { ReportPreviewModal } from '../components/reports/ReportPreviewModal'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import { Toast } from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import type { ReportData, ReportType, RecentExport, ReportDatePreset } from '../utils/reports'
import {
  DEFAULT_REPORT_DATE_PRESET,
  REPORT_DATE_PRESET_LABELS,
  REPORT_TYPE_LABELS,
  buildInventarioReportData,
  buildTxtFromReportData,
  buildVentasReportData,
  downloadTxtContent,
  formatGeneratedAt,
  getReportDateRangeForPreset,
} from '../utils/reports'

const REPORTS_STATS_KEY = 'elplonsazo-reports-stats'
const RECENT_EXPORTS_KEY = 'elplonsazo-recent-exports'
const MAX_RECENT_EXPORTS = 10

interface ReportsStats {
  generatedCount: number
  downloadsThisMonth: number
  monthKey: string
}

export type { RecentExport } from '../utils/reports'

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function loadReportsStats(): ReportsStats {
  const monthKey = currentMonthKey()
  try {
    const raw = localStorage.getItem(REPORTS_STATS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ReportsStats
      if (parsed.monthKey === monthKey) {
        return parsed
      }
      return { generatedCount: parsed.generatedCount ?? 0, downloadsThisMonth: 0, monthKey }
    }
  } catch {
    // ignore corrupt storage
  }
  return { generatedCount: 0, downloadsThisMonth: 0, monthKey }
}

function saveReportsStats(stats: ReportsStats): void {
  localStorage.setItem(REPORTS_STATS_KEY, JSON.stringify(stats))
}

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}\-_]+/gu, '-').replace(/-+/g, '-').slice(0, 60) || 'informe'
}

function normalizeExport(item: Partial<RecentExport>, index: number): RecentExport | null {
  if (!item.name || !item.type || !item.date) return null

  const hasContent = Boolean(item.content?.trim())
  const hasData = Boolean(item.data)
  const filename = item.filename?.endsWith('.txt')
    ? item.filename
    : item.filename?.replace(/\.csv$/i, '.txt') ?? `${sanitizeFilename(item.name)}.txt`

  return {
    id: item.id ?? `${item.date}-${index}`,
    name: item.name,
    type: item.type,
    date: item.date,
    filename,
    content: item.content ?? '',
    data: item.data,
    fromDate: item.fromDate,
    toDate: item.toDate,
    legacy: item.legacy ?? (!hasContent && !hasData),
    archived: item.archived ?? false,
  }
}

function loadRecentExports(): RecentExport[] {
  try {
    const raw = localStorage.getItem(RECENT_EXPORTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RecentExport>[]
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, index) => normalizeExport(item, index))
          .filter((item): item is RecentExport => item !== null)
          .slice(0, MAX_RECENT_EXPORTS)
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return []
}

function saveRecentExports(exports: RecentExport[]): void {
  localStorage.setItem(RECENT_EXPORTS_KEY, JSON.stringify(exports.slice(0, MAX_RECENT_EXPORTS)))
}

function saveRecentExport(entry: RecentExport): RecentExport[] {
  const next = [entry, ...loadRecentExports().filter((item) => item.id !== entry.id)].slice(0, MAX_RECENT_EXPORTS)
  saveRecentExports(next)
  return next
}

function exportKey(item: RecentExport): string {
  return item.id
}

interface ReportListProps {
  items: RecentExport[]
  emptyMessage: string
  onOpen: (item: RecentExport) => void
  onDownload: (item: RecentExport) => void
  onArchive: (item: RecentExport) => void
  onDelete: (item: RecentExport) => void
  onUnarchive?: (item: RecentExport) => void
}

function ReportList({ items, emptyMessage, onOpen, onDownload, onArchive, onDelete, onUnarchive }: ReportListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-lg px-xl py-3xl text-center">
        <Icon name="description" size={48} className="text-outline" />
        <p className="max-w-md font-body-md text-on-surface-variant">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-outline-variant">
      {items.map((item) => (
        <li key={exportKey(item)} className="group flex items-center gap-md px-lg py-md">
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex min-w-0 flex-1 items-center gap-md rounded-lg text-left transition-colors hover:bg-surface-container-high/60 -mx-2 px-2 py-1"
            title="Ver informe"
          >
            <div className="rounded-lg bg-primary/10 p-sm text-primary">
              <Icon name={item.type === 'ventas' ? 'receipt_long' : 'inventory_2'} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body-md font-semibold text-on-surface">{item.name}</p>
              <p className="text-body-sm text-on-surface-variant">
                {REPORT_TYPE_LABELS[item.type]} · {formatGeneratedAt(item.date)}
                {item.legacy ? ' · Sin contenido' : ''}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="rounded-lg p-2 text-on-surface-variant transition-all hover:border-primary hover:text-primary hover:bg-primary/10"
              title="Ver informe"
            >
              <Icon name="visibility" size={20} />
            </button>
            <button
              type="button"
              onClick={() => onDownload(item)}
              disabled={item.legacy || !item.content}
              className="rounded-lg p-2 text-on-surface-variant transition-all hover:border-primary hover:text-primary hover:bg-primary/10 disabled:opacity-40"
              title={item.legacy ? 'Regenera el informe para descargar' : 'Descargar TXT'}
            >
              <Icon name="download" size={20} />
            </button>
            {onUnarchive ? (
              <button
                type="button"
                onClick={() => onUnarchive(item)}
                className="rounded-lg p-2 text-on-surface-variant transition-all hover:text-primary hover:bg-primary/10"
                title="Restaurar informe"
              >
                <Icon name="unarchive" size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onArchive(item)}
                className="rounded-lg p-2 text-on-surface-variant transition-all hover:text-tertiary hover:bg-tertiary/10"
                title="Archivar informe"
              >
                <Icon name="archive" size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-lg p-2 text-on-surface-variant transition-all hover:text-error hover:bg-error/10"
              title="Eliminar informe"
            >
              <Icon name="delete" size={20} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ReportsPage() {
  const { toastMessage, showToast, dismissToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [previewReport, setPreviewReport] = useState<RecentExport | null>(null)
  const [reportName, setReportName] = useState('')
  const [reportType, setReportType] = useState<ReportType>('ventas')
  const [datePreset, setDatePreset] = useState<ReportDatePreset>(DEFAULT_REPORT_DATE_PRESET)
  const [fromDate, setFromDate] = useState(() => getReportDateRangeForPreset(DEFAULT_REPORT_DATE_PRESET).fromDate)
  const [toDate, setToDate] = useState(() => getReportDateRangeForPreset(DEFAULT_REPORT_DATE_PRESET).toDate)
  const [generating, setGenerating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [stats, setStats] = useState<ReportsStats>(() => loadReportsStats())
  const [recentExports, setRecentExports] = useState<RecentExport[]>(() => loadRecentExports())
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RecentExport | null>(null)

  const activeExports = useMemo(
    () => recentExports.filter((item) => !item.archived),
    [recentExports],
  )
  const archivedExports = useMemo(
    () => recentExports.filter((item) => item.archived),
    [recentExports],
  )

  const applyDatePreset = (preset: ReportDatePreset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const range = getReportDateRangeForPreset(preset)
      setFromDate(range.fromDate)
      setToDate(range.toDate)
    }
  }

  const openModal = () => {
    setReportName('')
    setReportType('ventas')
    applyDatePreset(DEFAULT_REPORT_DATE_PRESET)
    setFormError(null)
    setModalOpen(true)
  }

  const handleOpenReport = (item: RecentExport) => {
    setPreviewReport(item)
  }

  const recordDownload = () => {
    const nextStats: ReportsStats = {
      generatedCount: stats.generatedCount,
      downloadsThisMonth: stats.downloadsThisMonth + 1,
      monthKey: currentMonthKey(),
    }
    setStats(nextStats)
    saveReportsStats(nextStats)
  }

  const handleDownloadReport = (item: RecentExport) => {
    if (item.legacy || !item.content) {
      setPreviewReport(item)
      return
    }
    downloadTxtContent(item.filename, item.content)
    recordDownload()
    showToast(`Descarga iniciada: ${item.filename}`)
  }

  const handlePreviewDownload = (item: RecentExport) => {
    recordDownload()
    showToast(`Descarga iniciada: ${item.filename}`)
  }

  const handleArchiveReport = (item: RecentExport) => {
    const next = recentExports.map((entry) =>
      entry.id === item.id ? { ...entry, archived: true } : entry,
    )
    setRecentExports(next)
    saveRecentExports(next)
    showToast(`Informe archivado: ${item.name}`)
  }

  const handleUnarchiveReport = (item: RecentExport) => {
    const next = recentExports.map((entry) =>
      entry.id === item.id ? { ...entry, archived: false } : entry,
    )
    setRecentExports(next)
    saveRecentExports(next)
    showToast(`Informe restaurado: ${item.name}`)
  }

  const handleDeleteReport = (item: RecentExport) => {
    setDeleteTarget(item)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return

    const next = recentExports.filter((entry) => entry.id !== deleteTarget.id)
    setRecentExports(next)
    saveRecentExports(next)

    if (previewReport?.id === deleteTarget.id) {
      setPreviewReport(null)
    }

    const nextStats: ReportsStats = {
      generatedCount: Math.max(0, stats.generatedCount - 1),
      downloadsThisMonth: stats.downloadsThisMonth,
      monthKey: currentMonthKey(),
    }
    setStats(nextStats)
    saveReportsStats(nextStats)

    showToast(`Informe eliminado: ${deleteTarget.name}`)
    setDeleteTarget(null)
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
      const generatedAt = new Date().toISOString()
      const meta = {
        name,
        type: reportType,
        fromDate: reportType === 'ventas' ? fromDate : undefined,
        toDate: reportType === 'ventas' ? toDate : undefined,
        generatedAt,
      }

      let data: ReportData
      let filename: string

      if (reportType === 'ventas') {
        const result = await fetchSales({ from: fromDate, to: toDate, pageSize: 500 })
        data = buildVentasReportData(result.items, meta)
        filename = `${baseName}-ventas-${dateSuffix}.txt`
      } else {
        const result = await fetchInventory({ pageSize: 500 })
        data = buildInventarioReportData(result.items, meta)
        filename = `${baseName}-inventario-${dateSuffix}.txt`
      }

      const content = buildTxtFromReportData(data)

      const nextStats: ReportsStats = {
        generatedCount: stats.generatedCount + 1,
        downloadsThisMonth: stats.downloadsThisMonth,
        monthKey: currentMonthKey(),
      }
      setStats(nextStats)
      saveReportsStats(nextStats)

      const exportEntry: RecentExport = {
        id: crypto.randomUUID(),
        name,
        type: reportType,
        date: generatedAt,
        filename,
        content,
        data,
        fromDate: meta.fromDate,
        toDate: meta.toDate,
        legacy: false,
        archived: false,
      }
      setRecentExports(saveRecentExport(exportEntry))

      showToast(`Informe generado: ${name}. Haz clic para ver la vista previa.`)
      setModalOpen(false)
    } catch (err) {
      const message = getUserFacingApiError(
        err,
        'No se pudo generar el informe. Verifica tu conexión e inténtalo de nuevo.',
      )
      setFormError(message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-xl">
      <Toast message={toastMessage} onDismiss={dismissToast} />

      <div className="flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Informes</h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            Genera y exporta reportes del sistema en formato TXT con vista previa formateada. Los informes de ventas
            incluyen el estado de despacho (Preparando, Enviado, Entregado).
          </p>
        </div>
        <PrimaryActionButton size="compact" onClick={openModal}>
          Nuevo informe personalizado
        </PrimaryActionButton>
      </div>

      <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
        {[
          { label: 'Informes generados', value: String(stats.generatedCount), icon: 'description', color: 'text-primary' },
          { label: 'Descargas este mes', value: String(stats.downloadsThisMonth), icon: 'download', color: 'text-primary-dim' },
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
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">
          <h2 className="font-headline-sm text-headline-sm">Informes disponibles</h2>
          {archivedExports.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Icon name="archive" size={18} />
              {showArchived ? 'Ocultar archivados' : `Ver archivados (${archivedExports.length})`}
            </button>
          ) : null}
        </div>
        <ReportList
          items={activeExports}
          emptyMessage='Usa "Nuevo informe personalizado" para exportar datos de ventas o inventario.'
          onOpen={handleOpenReport}
          onDownload={handleDownloadReport}
          onArchive={handleArchiveReport}
          onDelete={handleDeleteReport}
        />
      </section>

      {showArchived && archivedExports.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <h2 className="font-headline-sm text-headline-sm">Archivados</h2>
          </div>
          <ReportList
            items={archivedExports}
            emptyMessage="No hay informes archivados."
            onOpen={handleOpenReport}
            onDownload={handleDownloadReport}
            onArchive={handleArchiveReport}
            onDelete={handleDeleteReport}
            onUnarchive={handleUnarchiveReport}
          />
        </section>
      ) : null}

      <ReportPreviewModal
        open={previewReport !== null}
        report={previewReport}
        onClose={() => setPreviewReport(null)}
        onDownload={handlePreviewDownload}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="¿Eliminar este informe?"
        icon="delete"
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="flex-1 rounded-lg bg-error py-2 font-label-md text-label-md text-on-error"
            >
              Eliminar
            </button>
          </div>
        }
      >
        <p className="text-body-sm text-on-surface-variant">Esta acción no se puede deshacer.</p>
      </Modal>

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
                {generating ? 'Generando…' : 'Generar informe'}
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

          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Rango de fechas</span>
            <Select
              value={datePreset}
              onChange={(e) => applyDatePreset(e.target.value as ReportDatePreset)}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none"
            >
              {(Object.keys(REPORT_DATE_PRESET_LABELS) as ReportDatePreset[]).map((preset) => (
                <option key={preset} value={preset}>
                  {REPORT_DATE_PRESET_LABELS[preset]}
                </option>
              ))}
            </Select>
          </label>

          {datePreset === 'custom' ? (
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
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
