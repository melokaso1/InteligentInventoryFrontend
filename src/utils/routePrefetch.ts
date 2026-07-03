import {
  fetchDashboardKpis,
  fetchDispatchOrders,
  fetchInvoiceStats,
  fetchInvoices,
  fetchLowStock,
  fetchProductStats,
  fetchProducts,
  fetchSaleMetrics,
  fetchSales,
} from '../api'
import { DEFAULT_SALES_DATE_PRESET, getSalesDateRangeForPreset } from '../utils/salesDatePresets'

const ROUTE_PREFETCHERS: Record<string, () => void> = {
  '/': () => {
    void fetchDashboardKpis()
    void fetchLowStock()
    void fetchDispatchOrders({ pageSize: 5, fulfillmentStatus: 'preparing' })
    void fetchDispatchOrders({ pageSize: 5, fulfillmentStatus: 'shipped' })
  },
  '/products': () => {
    void fetchProductStats()
    void fetchProducts({ page: 1, pageSize: 15 })
  },
  '/sales': () => {
    const { fromDate, toDate } = getSalesDateRangeForPreset(DEFAULT_SALES_DATE_PRESET)
    void fetchSales({ from: fromDate, to: toDate, pageSize: 50 })
    void fetchSaleMetrics({ from: fromDate, to: toDate })
  },
  '/invoices': () => {
    void fetchInvoiceStats()
    void fetchInvoices({ page: 1, pageSize: 20 })
  },
}

export function prefetchRouteData(path: string): void {
  const prefetch = ROUTE_PREFETCHERS[path]
  if (prefetch) prefetch()
}
