import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { ActivityItem } from '../../types'
import { formatRelativeTime } from '../../utils/format'
import { padToPageSize } from '../../utils/paginatedGrid'

type ActivityCategory = 'all' | 'sale' | 'invoice' | 'stock'

const TABS: { id: ActivityCategory; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'sale', label: 'Ventas' },
  { id: 'invoice', label: 'Facturas' },
  { id: 'stock', label: 'Stock' },
]

function getActivityCategory(item: ActivityItem): Exclude<ActivityCategory, 'all'> {
  if (item.title.startsWith('Venta')) return 'sale'
  if (item.title.startsWith('Factura')) return 'invoice'
  return 'stock'
}

function getActivityIcon(category: Exclude<ActivityCategory, 'all'>) {
  if (category === 'sale') return 'point_of_sale'
  if (category === 'invoice') return 'receipt_long'
  return 'inventory_2'
}

function getActivityAccent(category: Exclude<ActivityCategory, 'all'>) {
  if (category === 'sale') return 'bg-primary/15 text-primary'
  if (category === 'invoice') return 'bg-secondary/15 text-secondary'
  return 'bg-warning/15 text-warning'
}

interface ActivityCarouselProps {
  items: ActivityItem[]
  maxItems?: number
}

function ActivityCardPlaceholder() {
  return (
    <article
      aria-hidden
      data-activity-card
      className="invisible pointer-events-none flex h-[9rem] min-h-[9rem] max-h-[9rem] w-full shrink-0 snap-start flex-col rounded-xl border border-outline-variant bg-surface-container-low p-md sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
    >
      <div className="flex min-h-0 flex-1 items-start gap-sm overflow-hidden">
        <div className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="h-[2.5rem] w-3/4" />
          <div className="mt-xs h-[2.5rem]" />
        </div>
      </div>
      <div className="mt-md h-3 w-1/4 shrink-0" />
    </article>
  )
}

export function ActivityCarousel({ items, maxItems = 8 }: ActivityCarouselProps) {
  const [activeTab, setActiveTab] = useState<ActivityCategory>('all')
  const [activePage, setActivePage] = useState(0)
  const [cardsPerPage, setCardsPerPage] = useState(3)
  const scrollRef = useRef<HTMLDivElement>(null)

  const limitedItems = useMemo(() => items.slice(0, maxItems), [items, maxItems])

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return limitedItems
    return limitedItems.filter((item) => getActivityCategory(item) === activeTab)
  }, [limitedItems, activeTab])

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / cardsPerPage))

  const paddedItems = useMemo(() => {
    const slotCount = Math.max(cardsPerPage, pageCount * cardsPerPage)
    return padToPageSize(filteredItems, slotCount)
  }, [filteredItems, cardsPerPage, pageCount])

  useEffect(() => {
    setActivePage(0)
  }, [activeTab, cardsPerPage])

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setCardsPerPage(3)
      else if (window.matchMedia('(min-width: 640px)').matches) setCardsPerPage(2)
      else setCardsPerPage(1)
    }

    updateCardsPerPage()
    window.addEventListener('resize', updateCardsPerPage)
    return () => window.removeEventListener('resize', updateCardsPerPage)
  }, [])

  const scrollToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(page, pageCount - 1))
      setActivePage(clamped)
      const el = scrollRef.current
      if (!el) return
      const card = el.querySelector<HTMLElement>('[data-activity-card]')
      if (!card) return
      const gap = 16
      el.scrollTo({ left: clamped * (card.offsetWidth + gap) * cardsPerPage, behavior: 'smooth' })
    },
    [cardsPerPage, pageCount],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      const card = el.querySelector<HTMLElement>('[data-activity-card]')
      if (!card) return
      const gap = 16
      const stride = (card.offsetWidth + gap) * cardsPerPage
      if (stride <= 0) return
      const page = Math.round(el.scrollLeft / stride)
      setActivePage(Math.max(0, Math.min(page, pageCount - 1)))
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [cardsPerPage, pageCount, filteredItems.length])

  return (
    <section className="min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-md border-b border-outline-variant bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-headline-sm text-headline-sm">Actividad reciente</h3>
        <div className="flex flex-wrap gap-xs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-md py-xs font-label-md text-xs transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex min-w-0 w-full max-w-full flex-col p-lg">
        {filteredItems.length === 0 ? (
          <p className="py-xl text-center text-on-surface-variant">Sin actividad en esta categoría</p>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="custom-scrollbar flex min-h-[9rem] min-w-0 w-full max-w-full flex-1 snap-x snap-mandatory gap-md overflow-x-auto scroll-smooth pb-sm"
            >
              {paddedItems.map((item, index) => {
                if (!item) {
                  return <ActivityCardPlaceholder key={`activity-placeholder-${index}`} />
                }

                const category = getActivityCategory(item)
                const accent = getActivityAccent(category)
                return (
                  <article
                    key={item.id}
                    data-activity-card
                    className="flex h-[9rem] min-h-[9rem] max-h-[9rem] w-full shrink-0 snap-start flex-col rounded-xl border border-outline-variant bg-surface-container-low p-md transition-shadow hover:shadow-md sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
                  >
                    <div className="flex min-h-0 flex-1 items-start gap-sm overflow-hidden">
                      <div className={`shrink-0 rounded-lg p-sm ${accent}`}>
                        <Icon name={getActivityIcon(category)} size={20} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="line-clamp-2 h-[2.5rem] overflow-hidden font-body-md font-bold leading-snug text-on-surface">
                          {item.title}
                        </p>
                        <p className="mt-xs line-clamp-2 h-[2.5rem] overflow-hidden text-body-sm leading-snug text-on-surface-variant">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <p className="mt-md shrink-0 truncate text-xs text-on-surface-variant">
                      {formatRelativeTime(item.time)}
                    </p>
                  </article>
                )
              })}
            </div>

            {pageCount > 1 && (
              <div className="mt-md flex min-w-0 w-full max-w-full items-center justify-between">
                <div className="flex gap-xs">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Página ${i + 1}`}
                      onClick={() => scrollToPage(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === activePage ? 'w-6 bg-primary' : 'w-2 bg-outline-variant hover:bg-primary/50'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-xs">
                  <button
                    type="button"
                    aria-label="Anterior"
                    disabled={activePage === 0}
                    onClick={() => scrollToPage(activePage - 1)}
                    className="rounded-lg border border-outline-variant p-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                  >
                    <Icon name="chevron_left" size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente"
                    disabled={activePage >= pageCount - 1}
                    onClick={() => scrollToPage(activePage + 1)}
                    className="rounded-lg border border-outline-variant p-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                  >
                    <Icon name="chevron_right" size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-md border-t border-outline-variant/50 pt-md text-right">
          <Link to="/reports" className="font-label-md text-label-md text-primary hover:underline">
            Ver todo en informes
          </Link>
        </div>
      </div>
    </section>
  )
}
