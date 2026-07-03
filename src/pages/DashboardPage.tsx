import { useCallback, useEffect, useRef, useState } from 'react'

import { Link } from 'react-router-dom'

import { fetchActivity, fetchDashboardKpis, fetchDispatchOrders, fetchLowStock } from '../api'

import { API_CONNECTION_ERROR_MESSAGE, ApiError, logApiError } from '../api/client'

import { ActivityCarousel } from '../components/dashboard/ActivityCarousel'

import { LowStockCarousel } from '../components/dashboard/LowStockCarousel'

import { PendingDispatchSection } from '../components/dashboard/PendingDispatchSection'

import { Icon } from '../components/ui/Icon'

import type { DashboardKpi, LowStockItem, Sale } from '../types'

import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'



const salesBars = [4, 6, 8, 5, 7]



export function DashboardPage() {

  const [kpis, setKpis] = useState<DashboardKpi[]>([])

  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])

  const [recentActivity, setRecentActivity] = useState<Awaited<ReturnType<typeof fetchActivity>>>([])

  const [preparingDispatch, setPreparingDispatch] = useState<{ totalCount: number; items: Sale[] }>({

    totalCount: 0,

    items: [],

  })

  const [shippedDispatch, setShippedDispatch] = useState<{ totalCount: number; items: Sale[] }>({

    totalCount: 0,

    items: [],

  })

  const [loading, setLoading] = useState(true)

  const [apiDown, setApiDown] = useState(false)

  const isInitialLoad = useRef(true)



  const loadDispatchWidgets = useCallback(async () => {

    try {

      const [preparingData, shippedData] = await Promise.all([

        fetchDispatchOrders({ pageSize: 5, fulfillmentStatus: 'preparing' }),

        fetchDispatchOrders({ pageSize: 5, fulfillmentStatus: 'shipped' }),

      ])

      setPreparingDispatch({ totalCount: preparingData.totalCount, items: preparingData.items })

      setShippedDispatch({ totalCount: shippedData.totalCount, items: shippedData.items })

    } catch {

      // Keep previous dispatch widgets on transient errors.

    }

  }, [])



  const loadDashboard = useCallback(async () => {

    try {

      const [kpiData, lowStockData, activityData] = await Promise.all([

        fetchDashboardKpis(),

        fetchLowStock(),

        fetchActivity(12),

      ])

      setKpis(kpiData)

      setLowStockItems(lowStockData)

      setRecentActivity(activityData)

      setApiDown(false)

      await loadDispatchWidgets()

    } catch (err) {

      if (err instanceof ApiError && (err.status === 502 || err.status === 0)) {

        logApiError('DashboardPage.loadDashboard', err)

        setApiDown(true)

      }

    } finally {

      if (isInitialLoad.current) {

        isInitialLoad.current = false

        setLoading(false)

      }

    }

  }, [loadDispatchWidgets])



  useEffect(() => {

    void loadDashboard()

  }, [loadDashboard])



  useRealtimeRefresh(loadDashboard, [loadDashboard], {

    scope: ['dashboard', 'inventory', 'sales', 'invoices', 'products'],

  })



  useRealtimeRefresh(loadDispatchWidgets, [loadDispatchWidgets], {

    intervalMs: 8_000,

    scope: ['orders'],

  })



  if (loading) {

    return (

      <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">

        Cargando panel…

      </div>

    )

  }



  return (

    <div className="min-w-0 w-full max-w-full space-y-xl">

      {apiDown && (

        <div

          role="alert"

          className="flex items-center gap-sm rounded-xl border border-error/30 bg-error/10 px-lg py-md font-body-sm text-body-sm text-error"

        >

          <Icon name="warning" size={20} className="shrink-0" />

          <span>{API_CONNECTION_ERROR_MESSAGE}</span>

        </div>

      )}

      <section className="grid min-w-0 w-full max-w-full grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">

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



      <PendingDispatchSection preparing={preparingDispatch} shipped={shippedDispatch} />



      <section className="min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">

        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-lg py-md">

          <h3 className="font-headline-sm text-headline-sm">Seguimiento de inventario bajo</h3>

          <Link to="/reports" className="font-label-md text-label-md text-primary hover:underline">

            Ver informe completo

          </Link>

        </div>

        <LowStockCarousel items={lowStockItems} />

      </section>



      <ActivityCarousel items={recentActivity} maxItems={8} />

    </div>

  )

}

