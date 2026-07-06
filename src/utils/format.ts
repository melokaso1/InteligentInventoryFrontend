/** Formatea un monto en pesos colombianos (COP): $124.500 o $124.500,00 */
export function formatCOP(amount: number, decimals?: number): string {
  const fractionDigits =
    decimals ?? (Number.isInteger(amount) ? 0 : 2)

  const formatted = amount.toLocaleString('es-CO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

  return `$${formatted}`
}

/** Alias de formatCOP — moneda por defecto del sistema. */
export const formatCurrency = formatCOP

const SALE_UNIT_LABELS: Record<string, string> = {
  unit: 'unidad',
  gram: 'gramo',
  kilogram: 'kilogramo',
  milligram: 'miligramo',
  milliliter: 'mililitro',
  liter: 'litro',
}

/** Etiqueta en español para la unidad de venta (p. ej. "gramo", "unidad"). */
export function saleUnitLabel(saleUnit?: string): string {
  if (!saleUnit) return 'unidad'
  return SALE_UNIT_LABELS[saleUnit] ?? saleUnit
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Fecha calendario en Colombia (COT) como yyyy-MM-dd. */
export function getColombiaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date)
}

/** Fecha local en formato yyyy-MM-dd (sin desfase UTC). */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Fecha inicial por defecto para informes: hace 30 días calendario locales. */
export function getDefaultReportFromDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return getLocalDateString(d)
}

/** Fecha final por defecto para informes: hoy calendario local (inclusive). */
export function getDefaultReportToDate(): string {
  return getLocalDateString(new Date())
}

/** Formatea una fecha para encabezados de agrupación: "2 de jul de 2026". */
export function formatGroupDate(iso: string): string {
  if (ISO_DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** Clave yyyy-MM-dd en zona Colombia para agrupar por día. */
export function getColombiaDateKey(iso: string): string {
  if (ISO_DATE_ONLY.test(iso)) return iso

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date)
}

/** Formatea fecha y hora ISO en zona Colombia (es-CO). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Formatea una fecha ISO a estilo medio en español (Colombia). */
export function formatDate(iso: string): string {
  if (ISO_DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date)
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date)
}

/** Tiempo relativo en español: "hace 2 h", o fecha media si es antiguo. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return formatDate(iso)

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`

  return formatDate(iso)
}

/** Formato compacto para montos grandes: $123,2M */
export function formatCOPCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    const formatted = millions.toLocaleString('es-CO', {
      minimumFractionDigits: millions % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    })
    return `$${formatted}M`
  }

  return formatCOP(amount)
}
