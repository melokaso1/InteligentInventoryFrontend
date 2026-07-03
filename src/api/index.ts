import type {
  ActivityItem,
  AppNotification,
  DashboardKpi,
  InventoryItem,
  Invoice,
  LowStockItem,
  NotificationList,
  Product,
  ProductStatus,
  Sale,
  StockMovement,
} from '../types'
import { apiFetch, buildApiError, ngrokSkipHeaders, type PagedResponse } from './client'
import {
  PERSIST_KEYS,
  PERSIST_TTL_MS,
  readPersisted,
  writePersisted,
} from '../utils/persistedCache'
import { getToken, getCurrentUser } from '../hooks/useAuth'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const LEGACY_CHAT_SESSION_KEY = 'elplonsazo-chat-session'
export const CHAT_SESSION_USER_KEY = 'elplonsazo-chat-session-user'

function chatSessionStorageKey(userId?: string | null): string {
  const id = userId ?? getCurrentUser()?.id ?? 'guest'
  return `elplonsazo-chat-session-${id}`
}

interface ApiProduct {
  id: string
  code: string
  name: string
  category: string
  price: number
  saleUnit?: string
  allowsFractional?: boolean
  unitContentLabel?: string | null
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
  fulfillmentStatus?: Sale['fulfillmentStatus']
  taxId?: string
  lineItems: { id: string; name: string; icon: string; quantity: number; unitPrice: number }[]
  subtotal: number
  tax: number
  grandTotal: number
  orderNumber: string
  invoiceNumber?: string
  deliveryAddress?: string
  deliveryCity?: string
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
  source?: 'manual' | 'chatbot' | 'sale'
  saleId?: string
  deliveryAddress?: string
  deliveryCity?: string
}

interface CreateManualInvoicePayload {
  customerName: string
  customerEmail?: string
  billingNote?: string
  lineItems: { productId: string; quantity: number }[]
}

interface CreateManualSalePayload {
  customerName: string
  customerEmail?: string
  origin: 'manual' | 'chatbot'
  status: 'pending' | 'invoiced' | 'confirmed' | 'cancelled'
  lineItems: { productId: string; quantity: number; measureUnit?: string }[]
}

interface CreateInvoicePayload {
  client: string
  billingNote: string
  date: string
  dueDate: string
  lineItems: { description: string; quantity: number; unitPrice: number }[]
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
  maxStock: number
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

export interface ChatCartLineItem {
  productCode: string
  productName: string
  quantity: number
  measureUnit?: string
  unitPrice: number
  subtotal: number
}

export interface ChatOperationSummary {
  transactionId: string
  status: string
  productCode: string
  productName: string
  quantity: number
  measureUnit?: string
  unitPrice: number
  subtotal: number
  tax: number
  total: number
  lineItems?: ChatCartLineItem[]
}

export interface ChatProductOffer {
  productCode: string
  productName: string
  unitPrice: number
  stock: number
  saleUnit?: string
}

export interface ChatApiResponse {
  response: string
  state: string
  invoiceNumber?: string
  chips?: string[]
  operationSummary?: ChatOperationSummary
  offers?: ChatProductOffer[]
  offersTotalCount?: number
}

export interface ChatHistoryMessage {
  senderType: string
  messageText: string
  createdAt: string
  metadataJson?: string | null
}

interface ChatHistoryBotMetadata {
  state?: string
  invoiceNumber?: string
  chips?: string[]
  operationSummary?: ChatOperationSummary
  offers?: ChatProductOffer[]
  offersTotalCount?: number
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    price: p.price,
    saleUnit: p.saleUnit,
    allowsFractional: p.allowsFractional,
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
    fulfillmentStatus: s.fulfillmentStatus ?? 'preparing',
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
    orderNumber: s.orderNumber,
    invoiceNumber: s.invoiceNumber,
    deliveryAddress: s.deliveryAddress,
    deliveryCity: s.deliveryCity,
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
    source: i.source,
    saleId: i.saleId,
    deliveryAddress: i.deliveryAddress,
    deliveryCity: i.deliveryCity,
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
  status?: ProductStatus
  page?: number
  pageSize?: number
}, signal?: AbortSignal): Promise<PagedResponse<Product>> {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.category) search.set('category', params.category)
  if (params?.status) search.set('status', params.status)
  search.set('page', String(params?.page ?? 1))
  search.set('pageSize', String(params?.pageSize ?? 15))
  const url = `/api/products?${search.toString()}`
  const data = await apiFetch<PagedResponse<ApiProduct>>(url, { signal })
  return { ...data, items: data.items.map(mapProduct) }
}

export async function fetchProductStats(): Promise<ApiProductStats> {
  // Stats must always reflect the latest catalog state (toggle, create, delete).
  return apiFetch<ApiProductStats>('/api/products/stats')
}

export async function fetchProductCategories(): Promise<string[]> {
  const data = await fetchProductCategoriesFromApi()
  if (data.length > 0) {
    writePersisted(PERSIST_KEYS.productCategories, data)
  }
  return data
}

export function getProductCategoriesCached(): string[] {
  const cached = readPersisted<string[]>(
    PERSIST_KEYS.productCategories,
    PERSIST_TTL_MS.productCategories,
  )
  return cached && cached.length > 0 ? cached : []
}

let productCategoriesInflight: Promise<string[]> | null = null

function fetchProductCategoriesFromApi(): Promise<string[]> {
  if (!productCategoriesInflight) {
    productCategoriesInflight = apiFetch<string[]>('/api/products/categories').finally(() => {
      productCategoriesInflight = null
    })
  }
  return productCategoriesInflight
}

export interface CreateProductPayload {
  code: string
  name: string
  category: string
  price: number
  stock: number
  maxStock: number
  status?: ProductStatus
  icon?: string
  description?: string
  warehouse?: string
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const data = await apiFetch<ApiProduct>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapProduct(data)
}

export type UpdateProductPayload = CreateProductPayload

export async function updateProduct(id: string, payload: UpdateProductPayload): Promise<Product> {
  const data = await apiFetch<ApiProduct>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return mapProduct(data)
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' })
}

export async function duplicateProduct(id: string): Promise<Product> {
  const data = await apiFetch<ApiProduct>(`/api/products/${id}/duplicate`, {
    method: 'POST',
  })
  return mapProduct(data)
}

export async function patchProductStatus(id: string, status: ProductStatus): Promise<Product> {
  const data = await apiFetch<ApiProduct>(`/api/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return mapProduct(data)
}

export async function fetchInventory(
  params?: {
    q?: string
    category?: string
    warehouse?: string
    stockLevel?: string
    page?: number
    pageSize?: number
  },
  signal?: AbortSignal,
): Promise<PagedResponse<InventoryItem>> {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.category) search.set('category', params.category)
  if (params?.warehouse) search.set('warehouse', params.warehouse)
  if (params?.stockLevel) search.set('stockLevel', params.stockLevel)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  const url = `/api/inventory${query ? `?${query}` : ''}`
  const data = await apiFetch<PagedResponse<ApiInventoryItem>>(url, { signal })
  return {
    ...data,
    items: data.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      warehouse: item.warehouse,
      quantity: item.quantity,
      maxStock: item.maxStock,
      unitPrice: item.unitPrice,
      stockLevel: item.stockLevel,
      stockPercent: item.stockPercent,
      icon: item.icon,
    })),
  }
}

export async function fetchInventoryCategories(): Promise<string[]> {
  return fetchProductCategories()
}

export async function fetchInventoryStats(): Promise<ApiInventoryStats> {
  return apiFetch<ApiInventoryStats>('/api/inventory/stats')
}

export async function fetchStockMovements(params?: {
  page?: number
  pageSize?: number
}): Promise<PagedResponse<StockMovement>> {
  const search = new URLSearchParams()
  search.set('page', String(params?.page ?? 1))
  search.set('pageSize', String(params?.pageSize ?? 20))
  const data = await apiFetch<PagedResponse<ApiStockMovement>>(
    `/api/inventory/movements?${search.toString()}`,
  )
  return {
    ...data,
    items: data.items.map((m) => ({
      id: m.id,
      type: m.type,
      sku: m.sku,
      change: m.change,
      timestamp: m.timestamp,
      detail: m.detail,
    })),
  }
}

export interface CreateInventoryAdjustmentPayload {
  productId?: string
  productCode?: string
  quantityChange: number
  maxStock?: number
  reason: string
  detail?: string
}

export interface InventoryAdjustmentResult extends StockMovement {
  resultingStock: number
  maxStock: number
  stockCapped: boolean
}

export async function createInventoryAdjustment(
  payload: CreateInventoryAdjustmentPayload,
): Promise<InventoryAdjustmentResult> {
  const data = await apiFetch<ApiStockMovement & {
    resultingStock: number
    maxStock: number
    stockCapped: boolean
  }>('/api/inventory/adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    id: data.id,
    type: data.type,
    sku: data.sku,
    change: data.change,
    timestamp: data.timestamp,
    detail: data.detail,
    resultingStock: data.resultingStock,
    maxStock: data.maxStock,
    stockCapped: data.stockCapped,
  }
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
  const url = `/api/sales${query ? `?${query}` : ''}`
  const data = await apiFetch<PagedResponse<ApiSale>>(url)
  return { ...data, items: data.items.map(mapSale) }
}

export async function fetchSaleMetrics(params?: {
  from?: string
  to?: string
  origin?: string
  status?: string
}): Promise<ApiSaleMetrics> {
  const search = new URLSearchParams()
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  if (params?.origin) search.set('origin', params.origin)
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  const url = `/api/sales/metrics${query ? `?${query}` : ''}`
  return apiFetch<ApiSaleMetrics>(url)
}

export async function createManualSale(payload: CreateManualSalePayload): Promise<Sale> {
  const data = await apiFetch<ApiSale>('/api/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapSale(data)
}

export async function createSaleInvoice(saleId: string): Promise<Invoice> {
  const data = await apiFetch<ApiInvoice>(`/api/sales/${saleId}/invoice`, {
    method: 'POST',
  })
  return mapInvoice(data)
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
  const url = `/api/invoices${query ? `?${query}` : ''}`
  const data = await apiFetch<PagedResponse<ApiInvoice>>(url)
  return { ...data, items: data.items.map(mapInvoice) }
}

export async function fetchInvoiceStats(): Promise<ApiInvoiceStats> {
  return apiFetch<ApiInvoiceStats>('/api/invoices/stats')
}

export async function fetchInvoicePdf(invoiceId: string): Promise<{ blob: Blob; filename: string }> {
  const headers: Record<string, string> = { ...ngrokSkipHeaders() }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}/api/invoices/${invoiceId}/pdf`, {
    headers,
  })

  if (!response.ok) {
    const raw = (await response.text()) || response.statusText
    throw buildApiError(raw, response.status)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(disposition)
  const filename = match?.[1]?.replace(/"/g, '').replace(/\.pdf$/i, '.txt') ?? 'factura.txt'

  return { blob, filename }
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const data = await apiFetch<ApiInvoice>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapInvoice(data)
}

export async function createManualInvoice(payload: CreateManualInvoicePayload): Promise<Invoice> {
  const data = await apiFetch<ApiInvoice>('/api/invoices/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapInvoice(data)
}

export async function fetchMyInvoices(params?: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<PagedResponse<Invoice>> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.status) search.set('status', params.status)
  const query = search.toString()
  const data = await apiFetch<PagedResponse<ApiInvoice>>(`/api/my/invoices${query ? `?${query}` : ''}`)
  return { ...data, items: data.items.map(mapInvoice) }
}

export async function payInvoice(invoiceId: string, paymentMethod: string): Promise<Invoice> {
  const data = await apiFetch<ApiInvoice>(`/api/invoices/${invoiceId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod }),
  })
  return mapInvoice(data)
}

export async function payMyInvoice(invoiceId: string, paymentMethod: string): Promise<Invoice> {
  const data = await apiFetch<ApiInvoice>(`/api/my/invoices/${invoiceId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod }),
  })
  return mapInvoice(data)
}

export async function fetchChatHealth(): Promise<{
  status: string
  chatbot: string
}> {
  return apiFetch<{
    status: string
    chatbot: string
  }>('/api/chat/health')
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatApiResponse> {
  return apiFetch<ChatApiResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ sessionId, message }),
  })
}

export async function fetchChatHistory(sessionId: string): Promise<ChatHistoryMessage[]> {
  const encoded = encodeURIComponent(sessionId)
  return apiFetch<ChatHistoryMessage[]>(`/api/chat/sessions/${encoded}/history`)
}

export function clearChatSession(): void {
  const userId = getCurrentUser()?.id
  sessionStorage.removeItem(LEGACY_CHAT_SESSION_KEY)
  if (userId) {
    sessionStorage.removeItem(chatSessionStorageKey(userId))
  }
  sessionStorage.removeItem(chatSessionStorageKey('guest'))
  sessionStorage.removeItem(CHAT_SESSION_USER_KEY)
}

export function getChatSessionId(): string {
  const userId = getCurrentUser()?.id ?? 'guest'
  const key = chatSessionStorageKey(userId)
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `session-${crypto.randomUUID()}`
    sessionStorage.setItem(key, id)
    sessionStorage.setItem(CHAT_SESSION_USER_KEY, userId)
  }
  return id
}

export function createNewChatSession(): string {
  const userId = getCurrentUser()?.id ?? 'guest'
  const key = chatSessionStorageKey(userId)
  const id = `session-${crypto.randomUUID()}`
  sessionStorage.setItem(key, id)
  sessionStorage.setItem(CHAT_SESSION_USER_KEY, userId)
  return id
}

export function migrateGuestChatSessionOnLogin(userId?: string): void {
  const resolvedUserId = userId ?? getCurrentUser()?.id
  if (!resolvedUserId) return

  const guestKey = chatSessionStorageKey('guest')
  const guestSessionId = sessionStorage.getItem(guestKey)
  if (!guestSessionId) return

  sessionStorage.setItem(chatSessionStorageKey(resolvedUserId), guestSessionId)
  sessionStorage.removeItem(guestKey)
  sessionStorage.setItem(CHAT_SESSION_USER_KEY, resolvedUserId)
}

export function mapChatHistoryToMessages(history: ChatHistoryMessage[]): import('../types').ChatMessage[] {
  return history.map((item, index) => {
    let metadata: ChatHistoryBotMetadata | null = null
    if (item.metadataJson) {
      try {
        metadata = JSON.parse(item.metadataJson) as ChatHistoryBotMetadata
      } catch {
        metadata = null
      }
    }

    const createdAt = new Date(item.createdAt)
    const time = Number.isNaN(createdAt.getTime())
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    return {
      id: `hist-${index}-${item.createdAt}`,
      role: item.senderType === 'user' ? 'user' : 'assistant',
      content: item.messageText,
      time,
      chips: metadata?.chips,
      offers: metadata?.offers,
      offersTotalCount: metadata?.offersTotalCount,
    }
  })
}

export function getLatestChatStateFromHistory(history: ChatHistoryMessage[]): {
  chatState: string
  operationSummary: ChatOperationSummary | null
  invoiceNumber?: string
} {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i]
    if (item.senderType !== 'bot' || !item.metadataJson) continue

    try {
      const metadata = JSON.parse(item.metadataJson) as ChatHistoryBotMetadata
      return {
        chatState: metadata.state ?? 'idle',
        operationSummary: metadata.operationSummary ?? null,
        invoiceNumber: metadata.invoiceNumber,
      }
    } catch {
      continue
    }
  }

  return { chatState: 'idle', operationSummary: null }
}

interface ApiNotification {
  id: string
  title: string
  message: string
  type: string
  saleId?: string
  invoiceId?: string
  isRead: boolean
  createdAt: string
}

interface ApiNotificationList {
  unreadCount: number
  items: ApiNotification[]
}

export async function fetchDispatchOrders(params?: {
  page?: number
  pageSize?: number
  fulfillmentStatus?: string
}): Promise<PagedResponse<Sale>> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  if (params?.fulfillmentStatus) query.set('fulfillmentStatus', params.fulfillmentStatus)

  const url = `/api/dispatch?${query.toString()}`
  const result = await apiFetch<PagedResponse<ApiSale>>(url)
  return { ...result, items: result.items.map(mapSale) }
}

export async function updateDispatchStatus(
  saleId: string,
  status: 'preparing' | 'shipped' | 'delivered',
): Promise<Sale> {
  const result = await apiFetch<ApiSale>(`/api/dispatch/${saleId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return mapSale(result)
}

export async function fetchMyOrders(params?: {
  page?: number
  pageSize?: number
  fulfillmentStatus?: string
}): Promise<PagedResponse<Sale>> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  if (params?.fulfillmentStatus) query.set('fulfillmentStatus', params.fulfillmentStatus)

  const result = await apiFetch<PagedResponse<ApiSale>>(`/api/my/orders?${query.toString()}`)
  return { ...result, items: result.items.map(mapSale) }
}

export async function confirmOrderDelivery(saleId: string): Promise<Sale> {
  const result = await apiFetch<ApiSale>(`/api/my/orders/${saleId}/confirm-delivery`, {
    method: 'POST',
  })
  return mapSale(result)
}

function mapNotification(n: ApiNotification): AppNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    saleId: n.saleId,
    invoiceId: n.invoiceId,
    isRead: n.isRead,
    createdAt: n.createdAt,
  }
}

export async function fetchNotifications(): Promise<NotificationList> {
  const result = await apiFetch<ApiNotificationList>('/api/notifications')
  return {
    unreadCount: result.unreadCount ?? 0,
    items: (result.items ?? []).map(mapNotification),
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export async function clearAllNotifications(): Promise<void> {
  await apiFetch('/api/notifications', { method: 'DELETE' })
}
