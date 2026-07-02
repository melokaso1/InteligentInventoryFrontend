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

/** Formatea una fecha ISO a estilo medio en español (Colombia). */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date)
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
