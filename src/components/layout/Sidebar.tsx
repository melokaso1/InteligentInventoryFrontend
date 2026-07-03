import { Link, NavLink } from 'react-router-dom'
import { navItems } from '../../data/navigation'
import { isAdmin, isLoggedIn } from '../../hooks/useAuth'
import { useSidebar } from '../../hooks/useSidebar'
import { prefetchRouteData } from '../../utils/routePrefetch'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

export function Sidebar() {
  const { open, setOpen } = useSidebar()
  const admin = isAdmin()
  const loggedIn = isLoggedIn()
  const visibleNavItems = navItems.filter((item) => {
    if (!loggedIn) {
      return item.to === '/chatbot'
    }
    if (item.adminOnly) return admin
    if (item.clienteOnly) return !admin
    return true
  })

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-sidebar-width flex-col overflow-y-auto border-r border-outline-variant/20 bg-inverse-surface dark:bg-black transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative px-lg pb-lg pt-xl">
          <button
            type="button"
            aria-label="Cerrar barra lateral"
            className="absolute right-md top-md rounded-full p-1 text-inverse-on-surface/70 hover:bg-inverse-on-surface/10 dark:text-on-surface-variant lg:hidden"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" size={20} />
          </button>
          <div className="flex flex-col items-center text-center">
            <Logo
              size="md"
              showText
              textClassName="font-headline-md text-headline-md font-extrabold text-primary-fixed dark:text-primary"
            />
            <p className="mt-sm font-body-sm text-body-sm text-secondary-fixed-dim opacity-70 dark:text-on-surface-variant">
              Suite empresarial
            </p>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-xs overflow-y-auto px-md">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onMouseEnter={() => loggedIn && prefetchRouteData(item.to)}
              onFocus={() => loggedIn && prefetchRouteData(item.to)}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-md px-md py-sm font-body-md text-body-md transition-colors duration-200 ease-in-out ${
                  isActive
                    ? 'border-l-2 border-primary bg-primary/10 font-bold text-primary'
                    : 'border-l-2 border-transparent text-secondary-fixed-dim hover:bg-surface-variant/10 hover:text-secondary-fixed dark:text-on-surface-variant dark:hover:text-on-surface'
                }`
              }
            >
              <Icon name={item.icon} filled={item.to === '/chatbot'} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {!loggedIn && (
          <div className="border-t border-outline-variant/20 p-md">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-md px-md py-sm font-body-md text-body-md text-primary transition-colors hover:bg-primary/10"
            >
              <Icon name="login" />
              <span>Iniciar sesión</span>
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
