import type {
  ActivityItem,
  DashboardKpi,
  InventoryItem,
  Invoice,
  LowStockItem,
  Product,
  ProductStatus,
  Sale,
  StockMovement,
} from '../types'
import { apiFetch, type PagedResponse } from './client'

interface ApiProduct {
  id: string
  code: string
  name: string
  category: string
  price: number
  stock: number
  maxStock: number
  status: ProductStatus
  icon: string
  description: string
}

interface ApiProductStats {
  totalProducts: number
  activeProducts: number
  inactiveProducts: number
  outOfStockProducts: number
  archivedProducts: number
  totalInventoryValue: number
}

interface ApiSale {
  id: string
  customer: string
  email: string
  origin: 'manual' | 'chatbot'
  date: string
  total: number
  status: Sale['status']
  taxId?: string
  lineItems: { id: string; name: string; icon: string; quantity: number; unitPrice: number }[]
  subtotal: number
  tax: number
  grandTotal: number
  orderNumber: string
  invoiceNumber?: string
}

interface ApiSaleMetrics {
  totalSales: number
  totalRevenue: number
  chatbotSales: number
  manualSales: number
  pendingSales: number
  invoicedSales: number
}

interface ApiInvoice {
  id: string
  client: string
  clientInitials: string
  billingNote: string
  date: string
  dueDate: string
  amount: number
  status: Invoice['status']
  lineItems: { description: string; quantity: number; unitPrice: number }[]
  subtotal: number
  tax: number
  total: number
  invoiceNumber: string
}

interface ApiInvoiceStats {
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  draftInvoices: number
  totalBilledAmount: number
}

interface ApiInventoryItem {
  id: string
  sku: string
  name: string
  category: string
  warehouse: string
  quantity: number
  unitPrice: number
  stockLevel: InventoryItem['stockLevel']
  stockPercent: number
  icon: string
}

interface ApiInventoryStats {
  totalItems: number
  totalUnits: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

interface ApiStockMovement {
  id: string
  type: StockMovement['type']
  sku: string
  change: string
  timestamp: string
  detail: string
}

interface ApiDashboardKpi {
  id: string
  label: string
  value: string
  change: string
  changeType: DashboardKpi['changeType']
  icon: string
  iconBg: string
  iconColor: string
}

interface ApiLowStockItem {
  id: string
  name: string
  sku: string
  currentStock: number
  reorderLevel: number
  status: LowStockItem['status']
}

export interface ChatOperationSummary {
  transactionId: string
  status: string
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  tax: number
  total: number
}

export interface ChatApiResponse {
  response: string
  state: string
  invoiceNumber?: string
  chips?: string[]
  operationSummary?: ChatOperationSummary
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    maxStock: p.maxStock,
    status: p.status,
    icon: p.icon,
    description: p.description,
  }
}

function mapSale(s: ApiSale): Sale {
  return {
    id: s.id,
    customer: s.customer,
    email: s.email,
    origin: s.origin,
    date: s.date,
    total: s.total,
    status: s.status,
    taxId: s.taxId,
    lineItems: s.lineItems.map((li) => ({
      id: li.id,
      name: li.name,
      icon: li.icon,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
    subtotal: s.subtotal,
    tax: s.tax,
    grandTotal: s.grandTotal,
  }
}

function mapInvoice(i: ApiInvoice): Invoice {
  return {
    id: i.id,
    client: i.client,
    clientInitials: i.clientInitials,
    billingNote: i.billingNote,
    date: i.date,
    dueDate: i.dueDate,
    amount: i.amount,
    status: i.status,
    lineItems: i.lineItems,
    subtotal: i.subtotal,
    tax: i.tax,
    total: i.total,
  }
}

export async function fetchDashboardKpis(): Promise<DashboardKpi[]> {
  return apiFetch<ApiDashboardKpi[]>('/api/dashboard/kpis')
}

export async function fetchLowStock(): Promise<LowStockItem[]> {
  const items = await apiFetch<ApiLowStockItem[]>('/api/dashboard/low-stock')
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    currentStock: item.currentStock,
    reorderLevel: item.reorderLevel,
    status: item.status,
  }))
}

export async function fetchActivity(limit = 20): Promise<ActivityItem[]> {
  return apiFetch<ActivityItem[]>(`/api/dashboard/activity?limit=${limit}`)
}

export async function fetchProducts(params?: {
  q?: string
  category?: string
  page?: number
  pageSize?: number
}): Promise<PagedResponse<Product>> {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.category) search.set('category', params.category)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  const data = await apiFetch<PagedResponse<ApiProduct>>(`/api/products${query ? `?${query}` : ''}`)
  return { ...data, items: data.items.map(mapProduct) }
}

export async function fetchProductStats(): Promise<ApiProductStats> {
  return apiFetch<ApiProductStats>('/api/products/stats')
}

export async function fetchInventory(params?: {
  q?: string
  category?: string
  warehouse?: string
  stockLevel?: string
  page?: number
  pageSize?: number
}): Promise<PagedResponse<InventoryItem>> {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.category) search.set('category', params.category)
  if (params?.warehouse) search.set('warehouse', params.warehouse)
  if (params?.stockLevel) search.set('stockLevel', params.stockLevel)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  const data = await apiFetch<PagedResponse<ApiInventoryItem>>(`/api/inventory${query ? `?${query}` : ''}`)
  return {
    ...data,
    items: data.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      warehouse: item.warehouse,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      stockLevel: item.stockLevel,
      stockPercent: item.stockPercent,
      icon: item.icon,
    })),
  }
}

export async function fetchInventoryStats(): Promise<ApiInventoryStats> {
  return apiFetch<ApiInventoryStats>('/api/inventory/stats')
}

export async function fetchStockMovements(limit = 20): Promise<StockMovement[]> {
  const data = await apiFetch<PagedResponse<ApiStockMovement>>(
    `/api/inventory/movements?page=1&pageSize=${limit}`,
  )
  return data.items.map((m) => ({
    id: m.id,
    type: m.type,
    sku: m.sku,
    change: m.change,
    timestamp: m.timestamp,
    detail: m.detail,
  }))
}

export async function fetchSales(params?: {
  from?: string
  to?: string
  origin?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<PagedResponse<Sale>> {
  const search = new URLSearchParams()
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  if (params?.origin) search.set('origin', params.origin)
  if (params?.status) search.set('status', params.status)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  const data = await apiFetch<PagedResponse<ApiSale>>(`/api/sales${query ? `?${query}` : ''}`)
  return { ...data, items: data.items.map(mapSale) }
}

export async function fetchSaleMetrics(): Promise<ApiSaleMetrics> {
  return apiFetch<ApiSaleMetrics>('/api/sales/metrics')
}

export async function fetchInvoices(params?: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<PagedResponse<Invoice>> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  const data = await apiFetch<PagedResponse<ApiInvoice>>(`/api/invoices${query ? `?${query}` : ''}`)
  return { ...data, items: data.items.map(mapInvoice) }
}

export async function fetchInvoiceStats(): Promise<ApiInvoiceStats> {
  return apiFetch<ApiInvoiceStats>('/api/invoices/stats')
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatApiResponse> {
  return apiFetch<ChatApiResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ sessionId, message }),
  })
}

export function getChatSessionId(): string {
  const key = 'elplonsazo-chat-session'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `session-${crypto.randomUUID()}`
    sessionStorage.setItem(key, id)
  }
  return id
}
