import { useState, type ReactNode } from 'react'
import { Icon } from './Icon'

const STORAGE_PREFIX = 'plonsazo-help-'

function readExpanded(storageKey: string, defaultExpanded = true): boolean {
  if (typeof window === 'undefined') return defaultExpanded
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
    if (stored === 'false') return false
    if (stored === 'true') return true
  } catch {
    // ignore storage errors
  }
  return defaultExpanded
}

function persistExpanded(storageKey: string, expanded: boolean) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, String(expanded))
  } catch {
    // ignore storage errors
  }
}

export interface PageHelpCardProps {
  storageKey: string
  icon?: string
  title: string
  intro?: string
  steps: ReactNode[]
  tip?: ReactNode
  defaultExpanded?: boolean
  className?: string
}

export function PageHelpCard({
  storageKey,
  icon = 'info',
  title,
  intro,
  steps,
  tip,
  defaultExpanded = true,
  className = '',
}: PageHelpCardProps) {
  const [expanded, setExpanded] = useState(() => readExpanded(storageKey, defaultExpanded))

  const toggle = () => {
    setExpanded((open) => {
      const next = !open
      persistExpanded(storageKey, next)
      return next
    })
  }

  return (
    <div className={className}>
      <div className="rounded-xl border border-primary/25 bg-surface-container p-md shadow-sm">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between gap-md text-left"
          aria-expanded={expanded}
        >
          <div className="flex min-w-0 items-center gap-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon name={icon} size={20} className="text-primary" />
            </span>
            <span className="font-semibold text-on-surface">{title}</span>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
            {expanded ? 'Ocultar' : 'Mostrar'}
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
          </span>
        </button>

        {expanded ? (
          <div className="mt-md space-y-md border-t border-outline-variant/40 pt-md">
            {intro ? (
              <p className="text-sm leading-relaxed text-on-surface-variant">{intro}</p>
            ) : null}

            <ol className="list-inside list-decimal space-y-1 text-body-sm text-on-surface-variant">
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>

            {tip ? (
              <p className="flex items-start gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
                <Icon name="lightbulb" size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>{tip}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
