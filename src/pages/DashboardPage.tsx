import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchActivity, fetchDashboardKpis, fetchLowStock } from '../api'
import { ApiError } from '../api/client'
import { ActivityCarousel } from '../components/dashboard/ActivityCarousel'
import { Icon } from '../components/ui/Icon'
import type { DashboardKpi, LowStockItem } from '../types'

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
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<DashboardKpi[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [recentActivity, setRecentActivity] = useState<Awaited<ReturnType<typeof fetchActivity>>>([])
  const [loading, setLoading] = useState(true)
  const [apiDown, setApiDown] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [kpiData, lowStockData, activityData] = await Promise.all([
          fetchDashboardKpis(),
          fetchLowStock(),
          fetchActivity(12),
        ])
        if (!cancelled) {
          setKpis(kpiData)
          setLowStockItems(lowStockData)
          setRecentActivity(activityData)
          setApiDown(false)
        }
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 502) {
          setApiDown(true)
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
      {apiDown && (
        <div
          role="alert"
          className="flex items-center gap-sm rounded-xl border border-error/30 bg-error/10 px-lg py-md font-body-sm text-body-sm text-error"
        >
          <Icon name="warning" size={20} className="shrink-0" />
          <span>
            API no disponible (puerto 5151). Ejecuta <code className="font-mono text-xs">dotnet run</code> en{' '}
            <code className="font-mono text-xs">Backend/Api</code>.
          </span>
        </div>
      )}
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

      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">
          <h3 className="font-headline-sm text-headline-sm">Seguimiento de inventario bajo</h3>
          <Link to="/reports" className="font-label-md text-label-md text-primary hover:underline">
            Ver informe completo
          </Link>
        </div>
        {lowStockItems.length === 0 ? (
          <p className="px-lg py-xl text-center text-on-surface-variant">Sin alertas de stock bajo</p>
        ) : (
          <div className="grid grid-cols-1 gap-md p-lg sm:grid-cols-2 xl:grid-cols-3">
            {lowStockItems.map((item) => {
              const status = statusLabel(item.status)
              const barPct = stockBarWidth(item.currentStock, item.reorderLevel)
              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-low p-md transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-sm">
                    <div className="min-w-0">
                      <h4 className="truncate font-body-md font-bold text-on-surface">{item.name}</h4>
                      <p className="mt-xs font-mono text-xs text-on-surface-variant">{item.sku}</p>
                    </div>
                    <span className={`shrink-0 rounded px-sm py-xs text-[11px] font-bold ${status.className}`}>
                      {status.text}
                    </span>
                  </div>
                  <div className="mt-md flex items-center gap-sm">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className={`h-full ${stockBarColor(item.currentStock, item.reorderLevel)}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-body-sm font-bold">{item.currentStock} uds.</span>
                  </div>
                  <button
                    type="button"
                    className="mt-md flex w-full items-center justify-center gap-xs rounded-lg border border-outline-variant py-xs text-sm text-primary transition-colors hover:bg-primary/10"
                    onClick={() => {
                      const suggestedQty = Math.max(1, item.reorderLevel - item.currentStock)
                      navigate(
                        `/inventory?action=adjust&sku=${encodeURIComponent(item.sku)}&qty=${suggestedQty}`,
                      )
                    }}
                  >
                    <Icon name="shopping_cart_checkout" size={18} />
                    Reponer stock
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <ActivityCarousel items={recentActivity} maxItems={8} />

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
