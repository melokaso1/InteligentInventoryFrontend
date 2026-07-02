import type { SelectHTMLAttributes } from 'react'
import { Icon } from './Icon'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className = '', children, ...props }: SelectProps) {
  const isFullWidth = className.includes('w-full')

  return (
    <div className={`relative ${isFullWidth ? 'block w-full' : 'inline-flex'}`}>
      <select
        className={`app-select appearance-none bg-surface-container-low pr-9 text-on-surface ${className}`}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="expand_more"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
        size={18}
      />
    </div>
  )
}
