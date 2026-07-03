import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'

const pageButtonBase =
  'inline-flex box-border h-9 w-9 min-w-9 max-w-9 shrink-0 items-center justify-center rounded border p-0 text-xs font-bold tabular-nums leading-none transition-colors'

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
  return (
    <div className="flex w-full min-w-0 max-w-full shrink-0 flex-nowrap items-center justify-center gap-1 sm:w-auto sm:justify-end">
      {children}
    </div>
  )
}

interface PaginationPagesProps {
  children: ReactNode
}

export function PaginationPages({ children }: PaginationPagesProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 overflow-x-auto sm:flex-initial">
      {children}
    </div>
  )
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
      className={`${pageButtonBase} border-outline-variant text-on-surface-variant hover:bg-surface disabled:opacity-50 ${className}`}
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

export function buildVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible = 5,
): number[] {
  if (totalPages <= 0) return []
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, currentPage - half)
  let end = start + maxVisible - 1

  if (end > totalPages) {
    end = totalPages
    start = Math.max(1, end - maxVisible + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
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
      className={`${pageButtonBase} ${
        active
          ? 'border-primary bg-primary text-on-primary'
          : 'border-outline-variant text-on-surface-variant hover:bg-surface'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
