import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, icon, children, footer }: ModalProps) {
  return (
    <div
      className={`fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-[100] flex items-center justify-center transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-surface-container-lowest w-full max-w-md rounded-xl shadow-2xl transform transition-transform duration-300 flex flex-col overflow-hidden border border-outline-variant mx-4 ${
          open ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-lg bg-surface-container border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-sm text-primary">
            {icon && <Icon name={icon} />}
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="p-lg space-y-md">{children}</div>
        {footer && (
          <div className="p-lg bg-surface-container-low border-t border-outline-variant">{footer}</div>
        )}
      </div>
    </div>
  )
}
