import { createPortal } from 'react-dom'
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
  open: boolean
  onClose: () => void
}

export function PurchaseTutorialPanel({ open, onClose }: PurchaseTutorialPanelProps) {
  const overlay = (
    <Drawer open={open} onClose={onClose} title="Guía rápida" subtitle="¿Cómo comprar?">
      <TutorialContent />
    </Drawer>
  )

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay
}
