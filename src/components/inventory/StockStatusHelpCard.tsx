import { useState } from 'react'
import { Icon } from '../ui/Icon'

const stockLevels = [
  {
    key: 'out_of_stock',
    label: 'SIN STOCK',
    threshold: '0 uds.',
    badgeClass: 'bg-error/10 text-error border border-error/20',
  },
  {
    key: 'critical',
    label: 'CRÍTICO',
    threshold: '≤10%',
    badgeClass: 'bg-error/10 text-error border border-error/20',
  },
  {
    key: 'low',
    label: 'BAJO',
    threshold: '≤30%',
    badgeClass:
      'bg-on-tertiary-fixed-variant/10 text-on-tertiary-fixed-variant border border-outline-variant',
  },
  {
    key: 'medium',
    label: 'MEDIO',
    threshold: '≤70%',
    badgeClass: 'bg-tertiary-container text-on-tertiary-container border border-outline-variant',
  },
  {
    key: 'high',
    label: 'ALTO',
    threshold: '>70%',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
  },
] as const

export function StockStatusHelpCard() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-outline-variant px-md pb-md pt-md">
      <div className="rounded-xl border border-primary/25 bg-surface-container p-md shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-md text-left"
          aria-expanded={expanded}
        >
          <div className="flex min-w-0 items-center gap-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="info" size={20} className="text-primary" />
            </span>
            <span className="font-semibold text-on-surface">¿Qué significa Estado?</span>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
            {expanded ? 'Ocultar' : 'Mostrar'}
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
          </span>
        </button>

        {expanded ? (
          <div className="mt-md space-y-md border-t border-outline-variant/40 pt-md">
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Indica el nivel de stock según el porcentaje respecto a la capacidad máxima del
              producto. Los productos sin unidades disponibles se consideran sin stock.
            </p>

            <div className="flex flex-wrap gap-2">
              {stockLevels.map((level) => (
                <span
                  key={level.key}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter ${level.badgeClass}`}
                >
                  {level.label}
                  <span className="font-normal normal-case tracking-normal opacity-90">
                    ({level.threshold})
                  </span>
                </span>
              ))}
            </div>

            <p className="flex items-start gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
              <Icon name="inventory_2" size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-on-surface">Ejemplo:</span> dos productos con 10
                uds. pueden tener estados distintos si su capacidad máxima difiere.
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
