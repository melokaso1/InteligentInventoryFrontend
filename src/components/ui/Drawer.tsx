import type { ReactNode } from 'react'
import { useOverlayLock } from '../../hooks/useOverlayLock'
import { releaseOverlayFocus } from '../../utils/a11y'
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
  useOverlayLock(open)

  const handleClose = () => {
    releaseOverlayFocus()
    onClose()
  }

  return (
    <div
      className={`fixed inset-0 z-[100] transition-all duration-300 ${
        open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-inverse-surface/40 transition-opacity duration-300 cursor-pointer ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`absolute right-0 top-0 flex h-full min-w-0 max-w-full flex-col overflow-hidden border-l border-outline-variant bg-surface-container-lowest shadow-2xl transition-transform duration-300 pointer-events-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `min(${width}, 100vw)` }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant p-lg">
          <div className="min-w-0 pr-sm">
            <h3 className="truncate font-headline-sm text-headline-sm text-on-surface">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-on-surface-variant">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-2 transition-all hover:bg-surface-container-high"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-lg">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-outline-variant p-lg">{footer}</div>
        )}
      </div>
    </div>
  )
}
