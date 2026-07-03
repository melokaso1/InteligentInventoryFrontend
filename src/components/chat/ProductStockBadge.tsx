import { StatusBadge } from '../ui/StatusBadge'

const healthyStockBadgeClassName =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded bg-primary-container/30 px-2 py-1 text-xs font-semibold leading-none text-on-primary-container decoration-0 dark:bg-primary-container dark:text-on-primary-container'

interface ProductStockBadgeProps {
  stock: number
}

export function ProductStockBadge({ stock }: ProductStockBadgeProps) {
  const label = `${stock} uds.`

  if (stock === 0) {
    return <StatusBadge variant="out_of_stock" className="shrink-0" />
  }
  if (stock <= 10) {
    return (
      <StatusBadge
        variant="critical"
        label={label}
        className="shrink-0 normal-case tracking-normal"
      />
    )
  }
  if (stock <= 25) {
    return (
      <StatusBadge
        variant="low_stock"
        label={label}
        className="shrink-0 normal-case tracking-normal"
      />
    )
  }

  return <span className={healthyStockBadgeClassName}>{label}</span>
}
