import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'

type PrimaryActionButtonSize = 'default' | 'compact' | 'sm'

interface PrimaryActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  icon?: string | false
  size?: PrimaryActionButtonSize
  fullWidth?: boolean
}

const sizeClasses: Record<PrimaryActionButtonSize, string> = {
  default: 'gap-2 px-lg py-2.5 font-semibold',
  compact: 'gap-xs px-md py-sm font-label-md text-label-md',
  sm: 'gap-xs px-md py-xs font-label-md text-label-md',
}

const iconSizes: Record<PrimaryActionButtonSize, number | undefined> = {
  default: undefined,
  compact: 18,
  sm: 16,
}

export function PrimaryActionButton({
  children,
  icon = 'add',
  size = 'default',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: PrimaryActionButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center',
        'rounded-lg bg-primary text-on-primary',
        'shadow-md transition-all hover:bg-primary-dim active:scale-[0.98]',
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {icon !== false && <Icon name={icon} size={iconSizes[size]} />}
      {children}
    </button>
  )
}
