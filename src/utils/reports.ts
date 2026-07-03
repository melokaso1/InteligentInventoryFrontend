import type { FulfillmentStatus, InventoryItem, Sale } from '../types'
import { formatCOP, formatDate, getLocalDateString } from './format'

export type ReportDatePreset = '1' | '7' | '30' | '90' | 'custom'

export const DEFAULT_REPORT_DATE_PRESET: Exclude<ReportDatePreset, 'custom'> = '30'

/** Días hacia atrás desde hoy (local) para cada preset; 0 = solo hoy. */
export const REPORT_DATE_PRESET_DAYS: Record<Exclude<ReportDatePreset, 'custom'>, number> = {
  '1': 0,
  '7': 7,
  '30': 30,
  '90': 90,
}

export const REPORT_DATE_PRESET_LABELS: Record<ReportDatePreset, string> = {
  '1': 'Último día',
  '7': 'Últimos 7 días',
  '30': 'Últimos 30 días',
  '90': 'Últimos 90 días',
  custom: 'Rango personalizado',
}

export function getReportDateRangeForPreset(
  preset: Exclude<ReportDatePreset, 'custom'>,
  referenceDate = new Date(),
): { fromDate: string; toDate: string } {
  const toDate = getLocalDateString(referenceDate)
  const from = new Date(referenceDate)
  from.setDate(from.getDate() - REPORT_DATE_PRESET_DAYS[preset])
  return { fromDate: getLocalDateString(from), toDate }
}

export type ReportType = 'ventas' | 'inventario'

export interface ReportMeta {
  name: string
  type: ReportType
  fromDate?: string
  toDate?: string
  generatedAt: string
}

export interface VentasReportRow {
  fecha: string
  cliente: string
  pedido: string
  sku: string
  producto: string
  cantidad: number
  total: number
  estadoDespacho: string
}

export interface InventarioReportRow {
  sku: string
  nombre: string
  categoria: string
  stock: number
  estado: string
  precio: number
}

export interface VentasReportData {
  type: 'ventas'
  meta: ReportMeta
  rows: VentasReportRow[]
  summary: {
    totalLineas: number
    totalIngresos: number
  }
}

export interface InventarioReportData {
  type: 'inventario'
  meta: ReportMeta
  rows: InventarioReportRow[]
  summary: {
    totalItems: number
    totalUnidades: number
    valorTotal: number
  }
}

export type ReportData = VentasReportData | InventarioReportData

export interface RecentExport {
  id: string
  name: string
  type: ReportType
  date: string
  filename: string
  content: string
  data?: ReportData
  fromDate?: string
  toDate?: string
  legacy?: boolean
  archived?: boolean
}

const STOCK_LEVEL_LABELS: Record<string, string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  critical: 'Crítico',
}

const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
}

function fulfillmentLabel(status?: FulfillmentStatus): string {
  if (!status) return FULFILLMENT_STATUS_LABELS.preparing
  return FULFILLMENT_STATUS_LABELS[status] ?? status
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  ventas: 'Ventas',
  inventario: 'Inventario',
}

function formatGeneratedAt(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    })
  } catch {
    return isoDate
  }
}

function padRight(value: string, width: number): string {
  const text = value.length > width ? value.slice(0, width) : value
  return text.padEnd(width, ' ')
}

function padLeft(value: string, width: number): string {
  const text = value.length > width ? value.slice(0, width) : value
  return text.padStart(width, ' ')
}

export function buildVentasReportData(sales: Sale[], meta: ReportMeta): VentasReportData {
  const rows: VentasReportRow[] = []
  for (const sale of sales) {
    const pedido = sale.orderNumber ?? sale.id.slice(0, 8).toUpperCase()
    const estadoDespacho = fulfillmentLabel(sale.fulfillmentStatus)
    if (sale.lineItems.length > 0) {
      for (const line of sale.lineItems) {
        rows.push({
          fecha: sale.date,
          cliente: sale.customer,
          pedido,
          sku: line.id,
          producto: line.name,
          cantidad: line.quantity,
          total: line.quantity * line.unitPrice,
          estadoDespacho,
        })
      }
    } else {
      rows.push({
        fecha: sale.date,
        cliente: sale.customer,
        pedido,
        sku: pedido,
        producto: '(sin detalle)',
        cantidad: 0,
        total: sale.grandTotal,
        estadoDespacho,
      })
    }
  }

  return {
    type: 'ventas',
    meta,
    rows,
    summary: {
      totalLineas: rows.length,
      totalIngresos: sales.reduce((sum, sale) => sum + sale.grandTotal, 0),
    },
  }
}

export function buildInventarioReportData(items: InventoryItem[], meta: ReportMeta): InventarioReportData {
  const rows = items.map((item) => ({
    sku: item.sku,
    nombre: item.name,
    categoria: item.category,
    stock: item.quantity,
    estado: STOCK_LEVEL_LABELS[item.stockLevel] ?? item.stockLevel,
    precio: item.unitPrice,
  }))

  return {
    type: 'inventario',
    meta,
    rows,
    summary: {
      totalItems: rows.length,
      totalUnidades: rows.reduce((sum, row) => sum + row.stock, 0),
      valorTotal: rows.reduce((sum, row) => sum + row.stock * row.precio, 0),
    },
  }
}

export function buildTxtFromReportData(data: ReportData): string {
  const { meta } = data
  const lines: string[] = [
    '='.repeat(78),
    `  EL PLONSAZO — INFORME DE ${meta.type === 'ventas' ? 'VENTAS' : 'INVENTARIO'}`,
    '='.repeat(78),
    '',
    `Nombre:      ${meta.name}`,
    `Tipo:        ${REPORT_TYPE_LABELS[meta.type]}`,
  ]

  if (meta.fromDate && meta.toDate) {
    lines.push(`Período:     ${formatDate(meta.fromDate)} — ${formatDate(meta.toDate)}`)
  }

  lines.push(`Generado:    ${formatGeneratedAt(meta.generatedAt)}`, '', '-'.repeat(78))

  if (data.type === 'ventas') {
    const widths = [12, 20, 10, 10, 22, 6, 12, 12]
    lines.push(
      '',
      'DETALLE DE VENTAS',
      '',
      ['Fecha', 'Cliente', 'Pedido', 'SKU', 'Producto', 'Cant.', 'Total', 'Despacho']
        .map((header, index) => (index >= 5 ? padLeft(header, widths[index]) : padRight(header, widths[index])))
        .join(' '),
      '-'.repeat(90),
    )

    for (const row of data.rows) {
      const cells = [
        formatDate(row.fecha).slice(0, widths[0]),
        row.cliente,
        row.pedido,
        row.sku,
        row.producto,
        String(row.cantidad),
        formatCOP(row.total),
        row.estadoDespacho,
      ]
      lines.push(
        cells
          .map((cell, index) => (index >= 5 ? padLeft(cell, widths[index]) : padRight(cell, widths[index])))
          .join(' '),
      )
    }

    lines.push(
      '',
      '-'.repeat(78),
      `Total líneas:  ${data.summary.totalLineas}`,
      `Ingresos:      ${formatCOP(data.summary.totalIngresos)}`,
    )
  } else {
    const widths = [12, 28, 16, 8, 10, 14]
    lines.push(
      '',
      'DETALLE DE INVENTARIO',
      '',
      ['SKU', 'Producto', 'Categoría', 'Stock', 'Estado', 'Precio']
        .map((header, index) => (index >= 3 ? padLeft(header, widths[index]) : padRight(header, widths[index])))
        .join(' '),
      '-'.repeat(78),
    )

    for (const row of data.rows) {
      const cells = [row.sku, row.nombre, row.categoria, String(row.stock), row.estado, formatCOP(row.precio)]
      lines.push(
        cells
          .map((cell, index) => (index >= 3 ? padLeft(cell, widths[index]) : padRight(cell, widths[index])))
          .join(' '),
      )
    }

    lines.push(
      '',
      '-'.repeat(78),
      `Total productos:   ${data.summary.totalItems}`,
      `Total unidades:    ${data.summary.totalUnidades}`,
      `Valor inventario:  ${formatCOP(data.summary.valorTotal)}`,
    )
  }

  lines.push('', '='.repeat(78))
  return lines.join('\n')
}

export function downloadTxtContent(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.txt') ? filename : `${filename}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export { REPORT_TYPE_LABELS, FULFILLMENT_STATUS_LABELS, formatGeneratedAt }
