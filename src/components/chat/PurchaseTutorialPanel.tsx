import { createPortal } from 'react-dom'
import { Icon } from '../ui/Icon'
import { Drawer } from '../ui/Drawer'

const STEPS = [
  {
    title: 'Escribe en lenguaje natural',
    detail: 'Por ejemplo: «quiero 2 unidades de marihuana blue» o «buscar lsd».',
  },
  {
    title: 'Elige el producto',
    detail: 'Si hay varias opciones, selecciona una del catálogo o indica el SKU.',
  },
  {
    title: 'Confirma cantidad y compra',
    detail: 'Indica cuántas unidades quieres y confirma cuando veas el resumen.',
  },
  {
    title: 'Revisa tu factura',
    detail: 'Tras comprar, consulta «ver factura» o «mis facturas» para ver el detalle.',
  },
]

const COMMAND_EXAMPLES = [
  { label: 'Stock', example: 'consultar stock de PLZ-MJ-001' },
  { label: 'Buscar', example: 'buscar marihuana' },
  { label: 'Catálogo', example: 'ver catálogo' },
  { label: 'Carrito', example: 'agregar al carrito' },
  { label: 'Facturas', example: 'ver factura' },
  { label: 'Cancelar', example: 'cancelar' },
]

function TutorialContent() {
  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Sigue estos pasos para comprar con Drogui sin complicaciones.
      </p>

      <ol className="flex flex-col gap-md">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-label-md text-label-md text-on-surface">{step.title}</p>
              <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div>
        <h3 className="font-label-md text-label-md text-on-surface">Ejemplos de comandos</h3>
        <ul className="mt-sm flex flex-col gap-xs">
          {COMMAND_EXAMPLES.map((item) => (
            <li
              key={item.label}
              className="min-w-0 break-words rounded border border-outline-variant/60 bg-surface-container-low px-sm py-xs"
            >
              <span className="font-label-md text-label-md text-primary">{item.label}:</span>{' '}
              <span className="break-all font-mono-sm text-mono-sm text-on-surface-variant">
                «{item.example}»
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface PurchaseTutorialPanelProps {
  desktopOpen: boolean
  mobileOpen: boolean
  onDesktopClose: () => void
  onMobileClose: () => void
  className?: string
}

export function PurchaseTutorialPanel({
  desktopOpen,
  mobileOpen,
  onDesktopClose,
  onMobileClose,
  className = '',
}: PurchaseTutorialPanelProps) {
  const mobileOverlay = (
    <Drawer open={mobileOpen} onClose={onMobileClose} title="Guía rápida" subtitle="¿Cómo comprar?">
      <TutorialContent />
    </Drawer>
  )

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(mobileOverlay, document.body) : mobileOverlay}

      {desktopOpen ? (
        <aside
          className={`hidden min-h-0 w-72 shrink-0 flex-col overflow-hidden border-l border-outline-variant bg-surface-container transition-all duration-300 lg:flex ${className}`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-md py-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">¿Cómo comprar?</h2>
            <button
              type="button"
              onClick={onDesktopClose}
              className="rounded p-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
              aria-label="Cerrar guía"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto p-md">
            <TutorialContent />
          </div>
        </aside>
      ) : null}
    </>
  )
}
