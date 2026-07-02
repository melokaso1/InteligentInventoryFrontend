import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchActivity, fetchDashboardKpis, fetchLowStock } from '../api'
import { Icon } from '../components/ui/Icon'
import type { ActivityItem, DashboardKpi, LowStockItem } from '../types'

const salesBars = [4, 6, 8, 5, 7]

function stockBarWidth(stock: number, reorder: number) {
  return Math.min(100, Math.round((stock / Math.max(reorder, 1)) * 100))
}

function stockBarColor(stock: number, reorder: number) {
  const pct = stock / Math.max(reorder, 1)
  if (pct <= 0.25) return 'bg-error'
  if (pct <= 0.5) return 'bg-primary-dim'
  return 'bg-primary'
}

function statusLabel(status: string) {
  if (status === 'critical') return { text: 'CRÍTICO', className: 'bg-error text-on-error' }
  if (status === 'low_stock') return { text: 'REPOSICIÓN', className: 'bg-error/10 text-error' }
  return { text: 'ADVERTENCIA', className: 'bg-primary/10 text-primary' }
}

export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpi[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [kpiData, lowStockData, activityData] = await Promise.all([
          fetchDashboardKpis(),
          fetchLowStock(),
          fetchActivity(20),
        ])
        if (!cancelled) {
          setKpis(kpiData)
          setLowStockItems(lowStockData)
          setRecentActivity(activityData)
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

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
        Cargando panel…
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-xl">
      <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-sm ${kpi.iconBg} ${kpi.iconColor}`}>
                <Icon name={kpi.icon} />
              </div>
              <span
                className={`font-label-md text-xs ${
                  kpi.changeType === 'negative' || kpi.changeType === 'warning'
                    ? 'text-error'
                    : 'text-primary-dim'
                }`}
              >
                {kpi.change}
              </span>
            </div>
            <div className="mt-md">
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">{kpi.label}</p>
              <h2 className="mt-xs font-display-lg text-display-lg">{kpi.value}</h2>
            </div>
            {kpi.id === 'products' && (
              <div className="mt-sm h-1 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="h-full w-3/4 bg-primary" />
              </div>
            )}
            {kpi.id === 'sales_today' && (
              <div className="mt-sm flex h-8 items-end gap-xs">
                {salesBars.map((h, i) => (
                  <div
                    key={i}
                    className={`w-2 rounded-t-xs ${i === 2 ? 'bg-primary' : 'bg-primary/20'}`}
                    style={{ height: `${h * 4}px` }}
                  />
                ))}
              </div>
            )}
            {kpi.id === 'low_stock' && (
              <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
                Requiere reposición inmediata
              </p>
            )}
            {kpi.id === 'chatbot_sales' && (
              <div className="mt-sm flex items-center gap-xs">
                <Icon name="trending_up" size={14} className="text-primary" />
                <span className="text-body-sm text-on-surface-variant">Crecimiento por automatización IA</span>
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <h3 className="font-headline-sm text-headline-sm">Seguimiento de inventario bajo</h3>
            <button type="button" className="font-label-md text-label-md text-primary hover:underline">
              Ver informe completo
            </button>
          </div>
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-surface-container-high/30">
                <tr>
                  {['Nombre del producto', 'SKU', 'Nivel de stock', 'Estado', 'Acción'].map((col) => (
                    <th
                      key={col}
                      className={`px-lg py-sm font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant ${
                        col === 'SKU' ? 'hidden whitespace-nowrap md:table-cell' : ''
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-lg py-md text-center text-on-surface-variant">
                      Sin alertas de stock bajo
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item) => {
                    const status = statusLabel(item.status)
                    const barPct = stockBarWidth(item.currentStock, item.reorderLevel)
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-surface-container-low/50">
                        <td className="px-lg py-md font-body-md font-bold">{item.name}</td>
                        <td className="hidden whitespace-nowrap px-lg py-md font-mono text-xs text-on-surface-variant md:table-cell">
                          {item.sku}
                        </td>
                        <td className="px-lg py-md">
                          <div className="flex items-center gap-sm">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-container">
                              <div
                                className={`h-full ${stockBarColor(item.currentStock, item.reorderLevel)}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="text-body-sm font-bold">{item.currentStock} unidades</span>
                          </div>
                        </td>
                        <td className="px-lg py-md">
                          <span
                            className={`rounded px-sm py-xs text-[11px] font-bold ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td className="px-lg py-md">
                          <button
                            type="button"
                            className="rounded p-xs text-primary transition-colors hover:bg-primary/10"
                          >
                            <Icon name="shopping_cart_checkout" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <h3 className="font-headline-sm text-headline-sm">Actividad reciente</h3>
          </div>
          <div className="custom-scrollbar max-h-[400px] flex-1 space-y-lg overflow-y-auto p-lg">
            {recentActivity.map((item, index) => (
              <div key={item.id} className="relative flex gap-md">
                {index < recentActivity.length - 1 && (
                  <div className="absolute bottom-0 left-2 top-8 w-px bg-outline-variant" />
                )}
                <div
                  className={`z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${item.dotBg} ${item.dotBorder}`}
                />
                <div>
                  <p className="font-body-md font-bold text-on-surface">{item.title}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{item.description}</p>
                  <span className="mt-xs block font-mono-sm text-[11px] uppercase text-outline">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Link
        to="/chatbot"
        className="group fixed bottom-lg right-md z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition-transform hover:scale-105 active:scale-95 sm:right-lg"
      >
        <Icon name="chat_bubble" size={28} />
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded border border-outline-variant bg-white px-md py-xs font-body-sm text-body-sm text-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-transparent dark:bg-inverse-surface dark:text-inverse-on-surface dark:shadow-none md:block">
          Chat de ayuda
        </span>
      </Link>
    </div>
  )
}
