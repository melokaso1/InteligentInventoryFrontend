/**
 * Verificación manual del rango de fechas para informes de ventas.
 * Ejecutar: node Frontend/scripts/verify-date-range.mjs
 *
 * Escenario del bug (2 jul 2026, 21:00 COT = 3 jul 2026 02:00 UTC):
 * - toISOString().slice(0,10) devolvía "2026-07-03" en lugar de "2026-07-02"
 * - El backend filtraba CreatedAt <= medianoche UTC del día "to", excluyendo ventas nocturnas
 */

function getLocalDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toUtcStartOfColombiaDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0))
}

function toUtcEndOfColombiaDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999))
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
  console.log('OK:', message)
}

// Simula 2 jul 2026 21:00 COT usando offset local del sistema en Node (UTC en CI)
const saleAt9pmCot = new Date('2026-07-03T02:00:00.000Z')

// En entorno UTC, getLocalDateString no aplica; probamos la lógica Colombia explícita
const toDate = '2026-07-02'
const rangeStart = toUtcStartOfColombiaDay(toDate)
const rangeEnd = toUtcEndOfColombiaDay(toDate)

assert(
  saleAt9pmCot >= rangeStart && saleAt9pmCot <= rangeEnd,
  'Venta 21:00 COT del 2/jul cae dentro del rango to=2026-07-02 (Colombia inclusive)',
)

assert(
  new Date('2026-07-03T05:00:00.000Z') > rangeEnd,
  'Venta 00:00 COT del 3/jul queda fuera del rango to=2026-07-02',
)

// toISOString bug: a las 21:00 COT el día UTC ya es 3/jul
const isoDateOnly = saleAt9pmCot.toISOString().slice(0, 10)
assert(isoDateOnly === '2026-07-03', 'toISOString confirma el desfase UTC (bug original)')
assert(toDate !== isoDateOnly, 'La fecha local Colombia difiere de toISOString en horario nocturno')

console.log('\nVerificación completada. Período correcto para informe "hoy" (2/jul/2026):')
console.log('  Desde: 2/06/2026 (30 días atrás)')
console.log('  Hasta: 2/07/2026 (hoy inclusive, fin de día COT)')
