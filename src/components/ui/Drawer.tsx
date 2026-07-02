import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '450px',
}: DrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] transition-all duration-300 ${
        open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
    >
      <div
        className={`absolute inset-0 bg-inverse-surface/40 transition-opacity duration-300 cursor-pointer ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`absolute right-0 top-0 h-full bg-surface-container-lowest shadow-2xl transition-transform duration-300 pointer-events-auto flex flex-col border-l border-outline-variant ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width }}
      >
        <div className="p-lg border-b border-outline-variant flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
            {subtitle && (
              <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-full transition-all"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-lg">{children}</div>
        {footer && (
          <div className="p-lg border-t border-outline-variant shrink-0">{footer}</div>
        )}
      </div>
    </div>
  )
}
