type JsonRecord = Record<string, unknown>

function toCamelCase(key: string): string {
  if (!key) return key
  return key.charAt(0).toLowerCase() + key.slice(1)
}

/** Convierte claves PascalCase/camelCase mixtas a camelCase de forma recursiva. */
export function normalizeJson<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item)) as T
  }

  if (typeof value !== 'object') {
    return value as T
  }

  const record = value as JsonRecord
  const normalized: JsonRecord = {}

  for (const [key, val] of Object.entries(record)) {
    normalized[toCamelCase(key)] = normalizeJson(val)
  }

  return normalized as T
}

export function pickValue<T>(record: JsonRecord, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in record && record[key] !== undefined) {
      return record[key] as T
    }
  }
  return undefined
}
