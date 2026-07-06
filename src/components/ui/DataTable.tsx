import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: ReactNode
  className?: string
  hideOnMobile?: boolean
  hideOnTablet?: boolean
  nowrap?: boolean
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  selectedId?: string
  getRowId: (row: T) => string
  headerClassName?: string
  compact?: boolean
  renderMobileCard?: (row: T, isSelected: boolean) => ReactNode
  /** When true, skip inner overflow-x wrapper so sticky header works inside a parent scroll container. */
  embedded?: boolean
  stickyHeader?: boolean
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  selectedId,
  getRowId,
  headerClassName,
  compact = false,
  renderMobileCard,
  embedded = false,
  stickyHeader = true,
}: DataTableProps<T>) {
  const headClass =
    headerClassName ??
    'border-b border-outline-variant text-on-surface-variant'

  const thStickyClass = stickyHeader ? 'sticky top-0 z-10 bg-surface-container-low' : ''

  const visibleColumns = (viewport: 'mobile' | 'desktop') =>
    columns.filter((col) => {
      if (viewport === 'mobile' && col.hideOnMobile) return false
      if (viewport === 'desktop' && col.hideOnTablet) return false
      return true
    })

  const rowClassName = (isSelected: boolean) =>
    `transition-colors group ${
      onRowClick ? 'cursor-pointer hover:bg-surface-container-low/80' : 'hover:bg-surface-container-low/50'
    } ${isSelected ? 'bg-primary-container/10 dark:bg-surface-container-high' : ''}`

  return (
    <>
      {renderMobileCard ? (
        <div className="divide-y divide-outline-variant/40 md:hidden">
          {data.map((row) => {
            const rowId = getRowId(row)
            const isSelected = selectedId === rowId
            return (
              <div
                key={rowId}
                onClick={() => onRowClick?.(row)}
                className={`${rowClassName(isSelected)} flex h-[6.5rem] min-h-[6.5rem] max-h-[6.5rem] items-center overflow-hidden px-md`}
              >
                <div className="min-w-0 flex-1">{renderMobileCard(row, isSelected)}</div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div
        className={`min-w-0 max-w-full ${embedded ? '' : 'overflow-x-auto'} ${
          renderMobileCard ? 'hidden md:block' : ''
        }`}
      >
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className={headClass}>
              {visibleColumns('desktop').map((col) => (
                <th
                  key={col.key}
                  className={`p-md text-[12px] font-bold uppercase tracking-widest ${thStickyClass} ${
                    col.nowrap ? 'whitespace-nowrap' : ''
                  } ${col.hideOnTablet ? 'hidden md:table-cell' : ''} ${
                    col.hideOnMobile ? 'hidden md:table-cell' : ''
                  } ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 font-body-md text-body-md text-on-surface">
            {data.map((row) => {
              const rowId = getRowId(row)
              const isSelected = selectedId === rowId
              return (
                <tr key={rowId} onClick={() => onRowClick?.(row)} className={rowClassName(isSelected)}>
                  {visibleColumns('desktop').map((col) => (
                    <td
                      key={col.key}
                      className={`${compact ? 'p-sm md:p-md' : 'p-md'} ${
                        col.nowrap ? 'whitespace-nowrap' : ''
                      } ${col.hideOnTablet ? 'hidden md:table-cell' : ''} ${
                        col.hideOnMobile ? 'hidden md:table-cell' : ''
                      } ${col.className ?? ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export type { Column }
