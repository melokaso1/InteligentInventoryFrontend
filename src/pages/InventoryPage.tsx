import { useEffect, useState } from 'react'
import type { InventoryItem } from '../types'
import { fetchInventory, fetchInventoryStats, fetchStockMovements } from '../api'
import { Icon } from '../components/ui/Icon'
import { formatCOP, formatCOPCompact } from '../utils/format'
import { Modal } from '../components/ui/Modal'
import {
  PaginationControls,
  PaginationFooter,
  PaginationIconButton,
  PaginationInfo,
  PaginationPageButton,
} from '../components/ui/Pagination'
import { PrimaryActionButton } from '../components/ui/PrimaryActionButton'
import { Select } from '../components/ui/Select'
import type { StockMovement } from '../types'

const stockLevelBadge: Record<string, string> = {
  high: 'bg-primary/10 text-primary border border-primary/20',
  medium: 'bg-tertiary-container text-on-tertiary-container border border-outline-variant',
  low: 'bg-on-tertiary-fixed-variant/10 text-on-tertiary-fixed-variant border border-outline-variant',
  critical: 'bg-error/10 text-error border border-error/20',
}

const stockLevelLabels: Record<string, string> = {
  high: 'ALTO',
  medium: 'MEDIO',
  low: 'BAJO',
  critical: 'CRÍTICO',
}

export function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUnits: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [inventoryResult, statsResult, movements] = await Promise.all([
          fetchInventory({ pageSize: 50 }),
          fetchInventoryStats(),
          fetchStockMovements(10),
        ])
        if (!cancelled) {
          setInventoryItems(inventoryResult.items)
          setTotalCount(inventoryResult.totalCount)
          setStats(statsResult)
          setStockMovements(movements)
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

  const inventoryKpis = [
    {
      label: 'Total de SKU',
      value: stats.totalItems.toLocaleString('es-CO'),
      change: `${stats.totalUnits.toLocaleString('es-CO')} uds`,
      note: 'Productos activos en almacén',
      icon: 'category',
    },
    {
      label: 'Valor total del inventario',
      value: formatCOPCompact(stats.totalValue),
      change: 'Tiempo real',
      note: 'Valor estimado de mercado del stock',
      icon: 'payments',
    },
    {
      label: 'Artículos con stock crítico',
      value: String(stats.lowStockCount + stats.outOfStockCount),
      change: stats.outOfStockCount > 0 ? `${stats.outOfStockCount} sin stock` : 'Controlado',
      note: 'Artículos que requieren reposición inmediata',
      icon: 'warning',
      critical: stats.lowStockCount + stats.outOfStockCount > 0,
    },
  ]

  const openModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando inventario…
      </div>
    )
  }

  return (
    <>
      <div className="min-w-0 space-y-lg">
        <div className="flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Resumen de inventario</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Gestiona y supervisa los niveles de stock empresarial en tiempo real.
            </p>
          </div>
          <PrimaryActionButton onClick={() => setModalOpen(true)}>
            Ajuste manual
          </PrimaryActionButton>
        </div>

        <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
          {inventoryKpis.map((kpi) => (
            <div
              key={kpi.label}
              className={`relative flex flex-col gap-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm ${
                kpi.critical ? 'overflow-hidden' : ''
              }`}
            >
              {kpi.critical && <div className="absolute right-0 top-0 h-full w-1 bg-error" />}
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  {kpi.label}
                </span>
                <Icon name={kpi.icon} className={kpi.critical ? 'text-error' : 'text-primary'} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${kpi.critical ? 'text-error' : 'text-on-surface'}`}>
                  {kpi.value}
                </span>
                <span className={`text-xs font-bold ${kpi.critical ? 'text-error' : 'text-primary'}`}>
                  {kpi.change}
                </span>
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">{kpi.note}</p>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex min-w-0 flex-col flex-wrap items-stretch gap-md border-b border-outline-variant bg-surface-container-low p-md sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="filter_list"
                className="absolute left-3 top-1/2 -translate-y-1/2 scale-90 text-outline"
              />
              <input
                className="w-full rounded border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-0"
                placeholder="Filtrar por producto o SKU..."
                type="text"
              />
            </div>
            <Select className="min-w-0 w-full rounded border border-outline-variant bg-surface-container-lowest pl-3 py-2 text-sm focus:border-primary focus:ring-0 outline-none sm:w-auto">
              <option>Todas las categorías</option>
            </Select>
            <Select className="min-w-0 w-full rounded border border-outline-variant bg-surface-container-lowest pl-3 py-2 text-sm focus:border-primary focus:ring-0 outline-none sm:w-auto">
              <option>Todos los niveles de stock</option>
            </Select>
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-outline px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-variant"
            >
              <Icon name="download" size={16} />
              Exportar
            </button>
          </div>

          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high/50">
                  {['Nombre del producto', 'SKU', 'Categoría', 'En stock', 'Estado', 'Precio unitario', 'Acciones'].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-gutter py-3 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant ${
                          col === 'SKU' ? 'hidden whitespace-nowrap md:table-cell' : ''
                        } ${
                          i === 3 || i === 5 ? 'text-right' : i === 6 ? 'text-center' : ''
                        }`}
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface">
                {inventoryItems.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openModal(row)}
                    className="cursor-pointer transition-colors hover:bg-primary/[0.04]"
                  >
                    <td className="px-gutter py-4 font-body-md font-bold text-on-surface">
                      <div className="min-w-0">
                        <p>{row.name}</p>
                        <p className="mt-0.5 font-mono text-xs font-normal text-on-surface-variant md:hidden">
                          {row.sku}
                        </p>
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap px-gutter py-4 md:table-cell">
                      <span className="inline-block rounded border border-outline-variant bg-surface-container px-2 py-0.5 font-mono text-xs text-on-surface dark:bg-surface-container-high">
                        {row.sku}
                      </span>
                    </td>
                    <td className="px-gutter py-4 font-body-sm text-body-sm text-on-surface">{row.category}</td>
                    <td className="px-gutter py-4 text-right font-body-sm text-body-sm">{row.quantity}</td>
                    <td className="px-gutter py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tighter ${stockLevelBadge[row.stockLevel]}`}
                      >
                        {stockLevelLabels[row.stockLevel] ?? row.stockLevel}
                      </span>
                    </td>
                    <td className="px-gutter py-4 text-right font-body-sm text-body-sm">
                      {formatCOP(row.unitPrice)}
                    </td>
                    <td className="px-gutter py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openModal(row)
                          }}
                          className="rounded p-2 text-primary transition-colors hover:bg-primary/10"
                          title="Ajustar stock"
                        >
                          <Icon name="edit_square" size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded p-2 text-on-surface-variant transition-colors hover:bg-secondary/10"
                          title="Ver detalles"
                        >
                          <Icon name="visibility" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationFooter className="p-md">
            <PaginationInfo>
              Mostrando <span className="font-bold">1 a {inventoryItems.length}</span> de{' '}
              {totalCount.toLocaleString('es-CO')} registros
            </PaginationInfo>
            <PaginationControls>
              <PaginationIconButton icon="chevron_left" disabled className="disabled:opacity-30" />
              <PaginationPageButton active>1</PaginationPageButton>
            </PaginationControls>
          </PaginationFooter>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant p-lg">
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Movimientos recientes</h4>
          </div>
          <div className="space-y-md p-lg">
            {stockMovements.length === 0 ? (
              <p className="text-on-surface-variant">Sin movimientos recientes</p>
            ) : (
              stockMovements.map((m) => (
                <div key={m.id} className="flex items-start gap-md">
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
                      m.type === 'inbound'
                        ? 'bg-primary-container/30 text-on-primary-container'
                        : m.type === 'outbound'
                          ? 'bg-error-container/20 text-error'
                          : 'bg-warning-container/80 text-on-warning-container'
                    }`}
                  >
                    <Icon
                      name={m.type === 'inbound' ? 'arrow_downward' : m.type === 'outbound' ? 'arrow_upward' : 'edit'}
                      size={16}
                    />
                  </div>
                  <div>
                    <p className="font-body-md font-semibold">{m.detail}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {m.sku} • {m.change}
                    </p>
                    <p className="mt-1 font-mono-sm text-mono-sm text-outline">{m.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajustar stock"
        icon="inventory_2"
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary"
            >
              Aplicar ajuste
            </button>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-md">
            <p className="font-body-md text-body-md">
              <span className="font-semibold">{selectedItem.name}</span>
              <span className="text-on-surface-variant"> ({selectedItem.sku})</span>
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Cantidad actual: <span className="font-bold text-on-surface">{selectedItem.quantity}</span>
            </p>
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">
                Cantidad del ajuste
              </label>
              <input
                type="number"
                defaultValue={0}
                className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-on-surface-variant">Motivo</label>
              <Select className="mt-1 w-full rounded-lg border border-outline-variant pl-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option>Corrección manual</option>
                <option>Mercancía dañada</option>
                <option>Conteo de inventario</option>
              </Select>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
