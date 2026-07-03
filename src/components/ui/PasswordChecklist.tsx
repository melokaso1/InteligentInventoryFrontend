import { getPasswordRuleResults } from '../../utils/password'
import { Icon } from './Icon'

interface PasswordChecklistProps {
  password: string
  className?: string
}

export function PasswordChecklist({ password, className = '' }: PasswordChecklistProps) {
  const results = getPasswordRuleResults(password)

  return (
    <ul className={`space-y-1 text-body-sm ${className}`} aria-live="polite">
      {results.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1.5 ${rule.passed ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <Icon
            name={rule.passed ? 'check_circle' : 'radio_button_unchecked'}
            size={16}
            className={rule.passed ? 'text-primary' : 'text-outline'}
          />
          {rule.label}
        </li>
      ))}
    </ul>
  )
}
