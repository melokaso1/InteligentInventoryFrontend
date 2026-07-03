export type StockLevel = 'high' | 'medium' | 'low' | 'critical'

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock' | 'archived'

export interface Product {
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
  saleUnit?: string
  allowsFractional?: boolean
}

export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  warehouse: string
  quantity: number
  maxStock: number
  unitPrice: number
  stockLevel: StockLevel
  stockPercent: number
  icon: string
}

export interface StockMovement {
  id: string
  type: 'inbound' | 'adjustment' | 'outbound'
  sku: string
  change: string
  timestamp: string
  detail: string
}

export type SaleStatus = 'invoiced' | 'pending' | 'confirmed' | 'cancelled'
export type SaleOrigin = 'manual' | 'chatbot'
export type FulfillmentStatus = 'preparing' | 'shipped' | 'delivered'

export interface SaleLineItem {
  id: string
  name: string
  icon: string
  quantity: number
  unitPrice: number
}

export interface Sale {
  id: string
  customer: string
  email: string
  origin: SaleOrigin
  date: string
  total: number
  status: SaleStatus
  fulfillmentStatus?: FulfillmentStatus
  preparingSince?: string
  shippedAt?: string
  deliveredAt?: string
  taxId?: string
  lineItems: SaleLineItem[]
  subtotal: number
  tax: number
  grandTotal: number
  orderNumber?: string
  invoiceNumber?: string
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft'
export type InvoiceSource = 'manual' | 'chatbot' | 'sale'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
}

export interface Invoice {
  id: string
  client: string
  clientInitials: string
  billingNote: string
  date: string
  dueDate: string
  amount: number
  status: InvoiceStatus
  lineItems: InvoiceLineItem[]
  subtotal: number
  tax: number
  total: number
  source?: InvoiceSource
}

export interface ActivityItem {
  id: string
  title: string
  description: string
  time: string
  dotBg: string
  dotBorder: string
}

export interface LowStockItem {
  id: string
  name: string
  sku: string
  currentStock: number
  reorderLevel: number
  status: 'critical' | 'low_stock' | 'out_of_stock'
}

export interface DashboardKpi {
  id: string
  label: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'warning' | 'neutral'
  icon: string
  iconBg: string
  iconColor: string
}

export interface ChatProductOffer {
  productCode: string
  productName: string
  unitPrice: number
  stock: number
  saleUnit?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
  chips?: string[]
  offers?: ChatProductOffer[]
  offersTotalCount?: number
}

export interface NavItem {
  to: string
  label: string
  icon: string
  adminOnly?: boolean
  clienteOnly?: boolean
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: string
  saleId?: string
  isRead: boolean
  createdAt: string
}

export interface NotificationList {
  unreadCount: number
  items: AppNotification[]
}

export interface ReportItem {
  id: string
  name: string
  description: string
  category: string
  icon: string
  lastGenerated: string
  format: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface ContactCard {
  id: string
  title: string
  description: string
  action: string
  icon: string
}
