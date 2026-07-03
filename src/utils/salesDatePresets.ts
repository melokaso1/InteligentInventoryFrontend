import { getColombiaDateString } from './format'

export type SalesDatePreset = '1' | '7' | '30' | '60' | '90'

export const DEFAULT_SALES_DATE_PRESET: SalesDatePreset = '30'

/** Días hacia atrás desde hoy (Colombia); 0 = solo hoy. */
export const SALES_DATE_PRESET_DAYS: Record<SalesDatePreset, number> = {
  '1': 0,
  '7': 7,
  '30': 30,
  '60': 60,
  '90': 90,
}

export const SALES_DATE_PRESET_LABELS: Record<SalesDatePreset, string> = {
  '1': 'Último día',
  '7': 'Últimos 7 días',
  '30': 'Últimos 30 días',
  '60': 'Últimos 60 días',
  '90': 'Últimos 90 días',
}

export const SALES_DATE_PRESET_OPTIONS = (
  Object.keys(SALES_DATE_PRESET_DAYS) as SalesDatePreset[]
).map((preset) => ({
  value: preset,
  label: SALES_DATE_PRESET_LABELS[preset],
}))

export function getSalesDateRangeForPreset(
  preset: SalesDatePreset,
  referenceDate = new Date(),
): { fromDate: string; toDate: string } {
  const toDate = getColombiaDateString(referenceDate)
  const from = new Date(referenceDate)
  from.setDate(from.getDate() - SALES_DATE_PRESET_DAYS[preset])
  return { fromDate: getColombiaDateString(from), toDate }
}
