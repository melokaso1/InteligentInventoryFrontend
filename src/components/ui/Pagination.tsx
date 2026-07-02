import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'

const pageButtonBase =
  'inline-flex size-9 shrink-0 items-center justify-center rounded p-0 leading-none transition-all'

interface PaginationFooterProps {
  children: ReactNode
  className?: string
}

export function PaginationFooter({ children, className = '' }: PaginationFooterProps) {
  return (
    <div
      className={`flex flex-col gap-3 border-t border-outline-variant bg-surface-container-low px-md py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {children}
    </div>
  )
}

interface PaginationInfoProps {
  children: ReactNode
}

export function PaginationInfo({ children }: PaginationInfoProps) {
  return (
    <p className="text-center text-body-sm text-on-surface-variant sm:text-left">{children}</p>
  )
}

interface PaginationControlsProps {
  children: ReactNode
}

export function PaginationControls({ children }: PaginationControlsProps) {
  return <div className="flex items-center justify-center gap-1 sm:justify-end">{children}</div>
}

interface PaginationIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: 'chevron_left' | 'chevron_right'
}

export function PaginationIconButton({
  icon,
  className = '',
  ...props
}: PaginationIconButtonProps) {
  return (
    <button
      type="button"
      className={`${pageButtonBase} border border-outline-variant text-on-surface-variant hover:bg-surface disabled:opacity-50 ${className}`}
      {...props}
    >
      <Icon name={icon} size={18} className="leading-none" />
    </button>
  )
}

interface PaginationPageButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
}

export function PaginationPageButton({
  active = false,
  className = '',
  children,
  ...props
}: PaginationPageButtonProps) {
  return (
    <button
      type="button"
      className={`${pageButtonBase} text-xs font-bold ${
        active
          ? 'bg-primary text-on-primary'
          : 'border border-outline-variant text-on-surface-variant hover:bg-surface'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
