type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'critical'
  | 'low_stock'
  | 'out_of_stock'
  | 'invoiced'
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'paid'
  | 'overdue'
  | 'draft'
  | 'archived'
  | 'preparing'
  | 'shipped'
  | 'delivered'

const badgeStyles: Record<BadgeVariant, string> = {
  active:
    'bg-primary-container/30 text-on-primary-container dark:bg-primary-container dark:text-on-primary-container',
  inactive:
    'bg-secondary-container text-on-secondary-container dark:bg-secondary-container dark:text-on-secondary-container',
  critical:
    'bg-error-container/20 text-error dark:bg-error-container dark:text-on-error-container',
  low_stock:
    'bg-warning-container/80 text-on-warning-container dark:bg-warning-container dark:text-on-warning-container',
  out_of_stock:
    'bg-error-container/20 text-error dark:bg-error-container dark:text-on-error-container',
  invoiced:
    'bg-primary-container/30 text-on-primary-container border border-primary-container/50 dark:bg-primary-container dark:text-on-primary-container dark:border-primary-container',
  pending:
    'bg-warning-container/80 text-on-warning-container border border-warning-container dark:bg-warning-container dark:text-on-warning-container dark:border-warning-container',
  confirmed:
    'bg-primary-container/30 text-on-primary-container border border-primary-container/50 dark:bg-primary-container dark:text-on-primary-container dark:border-primary-container',
  cancelled:
    'bg-secondary-container text-on-secondary-container border border-outline-variant/40 dark:bg-secondary-container dark:text-on-secondary-container dark:border-outline-variant',
  paid: 'bg-primary-container/30 text-on-primary-container dark:bg-primary-container dark:text-on-primary-container',
  overdue:
    'bg-error-container/20 text-error dark:bg-error-container dark:text-on-error-container',
  draft:
    'bg-secondary-container text-on-secondary-container dark:bg-secondary-container dark:text-on-secondary-container',
  archived:
    'bg-secondary-container text-on-secondary-container dark:bg-secondary-container dark:text-on-secondary-container',
  preparing:
    'bg-warning-container/80 text-on-warning-container border border-warning-container dark:bg-warning-container dark:text-on-warning-container dark:border-warning-container',
  shipped:
    'bg-tertiary-container/80 text-on-tertiary-container border border-tertiary-container dark:bg-tertiary-container dark:text-on-tertiary-container dark:border-tertiary-container',
  delivered:
    'bg-primary-container/30 text-on-primary-container border border-primary-container/50 dark:bg-primary-container dark:text-on-primary-container dark:border-primary-container',
}

const variantLabels: Record<BadgeVariant, string> = {
  active: 'ACTIVO',
  inactive: 'INACTIVO',
  critical: 'CRÍTICO',
  low_stock: 'STOCK BAJO',
  out_of_stock: 'SIN STOCK',
  invoiced: 'FACTURADO',
  pending: 'PENDIENTE',
  confirmed: 'CONFIRMADO',
  cancelled: 'CANCELADO',
  paid: 'PAGADO',
  overdue: 'VENCIDO',
  draft: 'BORRADOR',
  archived: 'ARCHIVADO',
  preparing: 'PREPARANDO',
  shipped: 'ENVIADO',
  delivered: 'ENTREGADO',
}

interface StatusBadgeProps {
  variant: BadgeVariant
  label?: string
  className?: string
}

export function StatusBadge({ variant, label, className = '' }: StatusBadgeProps) {
  const displayLabel = label ?? variantLabels[variant]

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider ${badgeStyles[variant]} ${className}`}
    >
      {displayLabel}
    </span>
  )
}

export type { BadgeVariant }
