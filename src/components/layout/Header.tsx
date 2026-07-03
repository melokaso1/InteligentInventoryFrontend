import { NavLink } from 'react-router-dom'
import { isAdmin } from '../../hooks/useAuth'
import { useSidebar } from '../../hooks/useSidebar'
import { NotificationDropdown } from '../notifications/NotificationDropdown'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { ThemeToggle } from '../ui/ThemeToggle'

const HEADER_TABS = [
  { label: 'Resumen', to: '/', end: true, adminOnly: true },
  { label: 'Informes', to: '/reports', adminOnly: true },
  { label: 'Soporte', to: '/support' },
] as const

export function Header() {
  const { toggle: toggleSidebar } = useSidebar()
  const admin = isAdmin()
  const visibleTabs = HEADER_TABS.filter((tab) => !('adminOnly' in tab && tab.adminOnly) || admin)

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full min-w-0 max-w-full shrink-0 items-center justify-between gap-md border-b border-outline-variant bg-surface px-md shadow-sm sm:px-lg lg:ml-sidebar-width lg:w-[calc(100%-var(--spacing-sidebar-width))]">
      <div className="flex min-w-0 flex-1 items-center gap-md sm:gap-xl">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <Logo
          size="sm"
          showText
          className="shrink-0 lg:hidden"
          textClassName="font-headline-sm text-headline-sm font-extrabold text-on-primary-fixed dark:text-primary"
        />
      </div>

      <nav className="flex shrink-0 items-center gap-md sm:gap-lg">
        <div className="hidden items-center gap-md font-label-md text-label-md md:flex">
          {visibleTabs.map((tab) => (
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
          <NotificationDropdown />
          <ThemeToggle />
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-on-surface-variant"
            aria-label="Perfil"
          >
            <Icon name="account_circle" size={28} />
          </span>
        </div>
      </nav>
    </header>
  )
}
