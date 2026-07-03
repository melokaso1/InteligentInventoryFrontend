import { NavLink } from 'react-router-dom'
import { isAdmin, isLoggedIn } from '../../hooks/useAuth'
import { useSidebar } from '../../hooks/useSidebar'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { UserMenu } from './UserMenu'

const HEADER_TABS = [
  { label: 'Resumen', to: '/', end: true, adminOnly: true },
  { label: 'Informes', to: '/reports', adminOnly: true },
  { label: 'Soporte', to: '/support' },
] as const

export function Header() {
  const { toggle: toggleSidebar } = useSidebar()
  const admin = isAdmin()
  const loggedIn = isLoggedIn()
  const visibleTabs = HEADER_TABS.filter((tab) => !('adminOnly' in tab && tab.adminOnly) || admin)

  return (
    <header className="sticky top-0 z-30 grid h-16 w-full min-w-0 max-w-full shrink-0 grid-cols-3 items-center border-b border-outline-variant bg-surface px-md shadow-sm sm:px-lg lg:flex lg:justify-between lg:gap-md lg:ml-sidebar-width lg:w-[calc(100%-var(--spacing-sidebar-width))]">
      <div className="flex items-center justify-start lg:min-w-0 lg:flex-1">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high lg:hidden"
        >
          <Icon name="menu" />
        </button>
      </div>

      <div className="flex items-center justify-center lg:hidden">
        <Logo size="sm" iconClassName="h-10 max-h-10 w-auto object-contain" />
      </div>

      <nav className="flex items-center justify-end gap-md sm:gap-lg lg:shrink-0">
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
        <UserMenu loggedIn={loggedIn} />
      </nav>
    </header>
  )
}
