import type { ReactNode } from 'react'
import { useOverlayLock } from '../../hooks/useOverlayLock'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, icon, children, footer, wide = false }: ModalProps) {
  useOverlayLock(open)

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
        tabIndex={open ? 0 : -1}
      />
      <div
        className={`relative z-10 bg-surface-container-lowest w-full ${wide ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] rounded-xl shadow-2xl transform transition-transform duration-300 flex flex-col overflow-hidden border border-outline-variant mx-4 ${
          open ? 'scale-100' : 'scale-95'
        }`}
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
        <div className="overflow-y-auto p-lg space-y-md">{children}</div>
        {footer && (
          <div
            className="relative z-10 p-lg bg-surface-container-low border-t border-outline-variant"
            onClick={(e) => e.stopPropagation()}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
