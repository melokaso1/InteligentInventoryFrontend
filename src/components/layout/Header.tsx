import { NavLink } from 'react-router-dom'
import { PROFILE_AVATAR } from '../../data/mock'
import { useSidebar } from '../../hooks/useSidebar'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from '../ui/ThemeToggle'

interface HeaderProps {
  searchPlaceholder?: string
}

const HEADER_TABS = [
  { label: 'Resumen', to: '/', end: true },
  { label: 'Informes', to: '/reports' },
  { label: 'Soporte', to: '/support' },
] as const

export function Header({ searchPlaceholder = 'Buscar datos...' }: HeaderProps) {
  const { toggle: toggleSidebar } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full min-w-0 max-w-full shrink-0 items-center justify-between gap-md overflow-hidden border-b border-outline-variant bg-surface px-md shadow-sm sm:px-lg lg:ml-sidebar-width lg:w-[calc(100%-var(--spacing-sidebar-width))]">
      <div className="flex min-w-0 flex-1 items-center gap-md sm:gap-xl">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <span className="truncate font-headline-md text-headline-md font-extrabold text-on-primary-fixed dark:text-primary">
          El Plonsazo
        </span>
        <div className="relative hidden lg:block">
          <Icon
            name="search"
            className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
            size={18}
          />
          <input
            className="w-64 rounded-full border border-outline-variant bg-surface-container-low py-xs pl-xl pr-md font-body-sm text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
      </div>

      <nav className="flex shrink-0 items-center gap-md sm:gap-lg">
        <div className="hidden items-center gap-md font-label-md text-label-md md:flex">
          {HEADER_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={'end' in tab ? tab.end : false}
              className={({ isActive }) =>
                `cursor-pointer transition-colors active:opacity-80 ${
                  isActive
                    ? 'border-b-2 border-primary pb-1 font-bold text-primary'
                    : 'text-on-surface-variant hover:text-primary'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className="hidden h-6 w-px bg-outline-variant sm:block" />
        <div className="flex items-center gap-md">
          <button
            type="button"
            className="relative text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="notifications" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-error" />
          </button>
          <button
            type="button"
            className="hidden text-on-surface-variant transition-colors hover:text-primary sm:block"
          >
            <Icon name="help_outline" />
          </button>
          <ThemeToggle />
          <img
            className="h-8 w-8 rounded-full border border-outline-variant object-cover"
            src={PROFILE_AVATAR}
            alt="Perfil"
          />
        </div>
      </nav>
    </header>
  )
}
