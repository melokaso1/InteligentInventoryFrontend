export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Al menos una mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Al menos una minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Al menos un número', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'Al menos un símbolo', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function getPasswordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }))
}

export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label
  }
  return null
}
