import type { RecentExport } from '../../utils/reports'
import type { ReportData } from '../../utils/reports'
import { REPORT_TYPE_LABELS, downloadTxtContent, formatGeneratedAt } from '../../utils/reports'
import { formatCOP, formatDate } from '../../utils/format'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'

interface ReportPreviewModalProps {
  open: boolean
  report: RecentExport | null
  onClose: () => void
  onDownload: (report: RecentExport) => void
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-md">
      <span className="shrink-0 font-label-md text-label-md text-on-surface-variant sm:w-28">{label}</span>
      <span className="font-body-md text-on-surface">{value}</span>
    </div>
  )
}

function VentasPreview({ data }: { data: Extract<ReportData, { type: 'ventas' }> }) {
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full min-w-[720px] text-left text-body-sm">
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="px-3 py-2 font-label-md">Fecha</th>
              <th className="px-3 py-2 font-label-md">Cliente</th>
              <th className="px-3 py-2 font-label-md">Pedido</th>
              <th className="px-3 py-2 font-label-md">SKU</th>
              <th className="px-3 py-2 font-label-md">Producto</th>
              <th className="px-3 py-2 text-right font-label-md">Cant.</th>
              <th className="px-3 py-2 text-right font-label-md">Total</th>
              <th className="px-3 py-2 font-label-md">Despacho</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-on-surface-variant">
                  No hay ventas en el período seleccionado.
                </td>
              </tr>
            ) : (
              data.rows.map((row, index) => (
                <tr key={`${row.pedido}-${row.sku}-${row.fecha}-${index}`} className="hover:bg-surface-container-low/50">
                  <td className="whitespace-nowrap px-3 py-2 text-on-surface">{formatDate(row.fecha)}</td>
                  <td className="px-3 py-2 text-on-surface">{row.cliente}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-body-sm text-primary">{row.pedido}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-body-sm text-on-surface-variant">
                    {row.sku}
                  </td>
                  <td className="px-3 py-2 text-on-surface">{row.producto}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-on-surface">{row.cantidad}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-on-surface">
                    {formatCOP(row.total)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-on-surface">{row.estadoDespacho}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-lg rounded-lg border border-outline-variant bg-surface-container-low px-lg py-md">
        <div>
          <p className="text-label-md text-on-surface-variant">Total líneas</p>
          <p className="font-headline-sm text-headline-sm text-on-surface">{data.summary.totalLineas}</p>
        </div>
        <div>
          <p className="text-label-md text-on-surface-variant">Ingresos</p>
          <p className="font-headline-sm text-headline-sm text-primary">{formatCOP(data.summary.totalIngresos)}</p>
        </div>
      </div>
    </>
  )
}

function InventarioPreview({ data }: { data: Extract<ReportData, { type: 'inventario' }> }) {
  const estadoClass: Record<string, string> = {
    Alto: 'bg-primary/10 text-primary border-primary/20',
    Medio: 'bg-tertiary-container text-on-tertiary-container border-outline-variant',
    Bajo: 'bg-on-tertiary-fixed-variant/10 text-on-tertiary-fixed-variant border-outline-variant',
    Crítico: 'bg-error/10 text-error border-error/20',
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full min-w-[640px] text-left text-body-sm">
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="px-3 py-2 font-label-md">SKU</th>
              <th className="px-3 py-2 font-label-md">Producto</th>
              <th className="px-3 py-2 font-label-md">Categoría</th>
              <th className="px-3 py-2 text-right font-label-md">Stock</th>
              <th className="px-3 py-2 font-label-md">Estado</th>
              <th className="px-3 py-2 text-right font-label-md">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-on-surface-variant">
                  No hay productos en inventario.
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.sku} className="hover:bg-surface-container-low/50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-on-surface-variant">{row.sku}</td>
                  <td className="px-3 py-2 text-on-surface">{row.nombre}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{row.categoria}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-on-surface">{row.stock}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-label-md ${estadoClass[row.estado] ?? 'border-outline-variant text-on-surface-variant'}`}
                    >
                      {row.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-on-surface">
                    {formatCOP(row.precio)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-lg rounded-lg border border-outline-variant bg-surface-container-low px-lg py-md">
        <div>
          <p className="text-label-md text-on-surface-variant">Productos</p>
          <p className="font-headline-sm text-headline-sm text-on-surface">{data.summary.totalItems}</p>
        </div>
        <div>
          <p className="text-label-md text-on-surface-variant">Unidades</p>
          <p className="font-headline-sm text-headline-sm text-on-surface">{data.summary.totalUnidades}</p>
        </div>
        <div>
          <p className="text-label-md text-on-surface-variant">Valor inventario</p>
          <p className="font-headline-sm text-headline-sm text-primary">{formatCOP(data.summary.valorTotal)}</p>
        </div>
      </div>
    </>
  )
}

function LegacyEmptyState() {
  return (
    <div className="flex flex-col items-center gap-md rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-xl py-3xl text-center">
      <Icon name="history" size={48} className="text-outline" />
      <div className="max-w-sm space-y-sm">
        <p className="font-body-md font-semibold text-on-surface">Informe sin contenido</p>
        <p className="text-body-sm text-on-surface-variant">
          Este informe se generó con una versión anterior y no guardó los datos. Crea uno nuevo con el mismo nombre
          para ver la vista previa y descargar el archivo TXT.
        </p>
      </div>
    </div>
  )
}

export function ReportPreviewModal({ open, report, onClose, onDownload }: ReportPreviewModalProps) {
  if (!report) return null

  const isLegacy = report.legacy || (!report.content && !report.data)
  const data = report.data

  const handleDownload = () => {
    if (isLegacy || !report.content) return
    downloadTxtContent(report.filename, report.content)
    onDownload(report)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={report.name}
      icon={report.type === 'ventas' ? 'receipt_long' : 'inventory_2'}
      wide
      footer={
        <div className="flex gap-md">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isLegacy || !report.content}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="download" size={18} />
            Descargar TXT
          </button>
        </div>
      }
    >
      <div className="space-y-lg">
        <div className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-low p-md">
          <MetaRow label="Tipo" value={REPORT_TYPE_LABELS[report.type]} />
          {report.fromDate && report.toDate ? (
            <MetaRow
              label="Período"
              value={`${formatDate(report.fromDate)} — ${formatDate(report.toDate)}`}
            />
          ) : null}
          <MetaRow label="Generado" value={formatGeneratedAt(report.date)} />
        </div>

        {isLegacy ? (
          <LegacyEmptyState />
        ) : data?.type === 'ventas' ? (
          <VentasPreview data={data} />
        ) : data?.type === 'inventario' ? (
          <InventarioPreview data={data} />
        ) : report.content ? (
          <pre className="max-h-96 overflow-auto rounded-lg border border-outline-variant bg-surface-container-low p-md font-mono text-body-sm text-on-surface whitespace-pre-wrap">
            {report.content}
          </pre>
        ) : (
          <LegacyEmptyState />
        )}
      </div>
    </Modal>
  )
}
