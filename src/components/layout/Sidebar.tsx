import { NavLink } from 'react-router-dom'
import { navItems } from '../../data/navigation'
import { isAdmin, useAuth } from '../../hooks/useAuth'
import { useSidebar } from '../../hooks/useSidebar'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { PrimaryActionButton } from '../ui/PrimaryActionButton'

export function Sidebar() {
  const { logout } = useAuth()
  const { open, setOpen } = useSidebar()
  const admin = isAdmin()
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || admin)

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
        <div className="px-lg py-xl">
          <div className="flex items-start justify-between">
            <div>
              <Logo
                size="md"
                showText
                textClassName="font-headline-md text-headline-md text-primary-fixed dark:text-primary"
              />
              <p className="mt-xs font-body-sm text-body-sm text-secondary-fixed-dim dark:text-on-surface-variant opacity-70">
                Suite empresarial
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar barra lateral"
              className="rounded-full p-1 text-inverse-on-surface/70 hover:bg-inverse-on-surface/10 dark:text-on-surface-variant lg:hidden"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-xs overflow-y-auto px-md">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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

        <div className="border-t border-outline-variant/20 p-md">
          {admin && (
            <PrimaryActionButton fullWidth size="compact" className="mb-md">
              Nueva entrada
            </PrimaryActionButton>
          )}
          <div className="space-y-xs">
            {admin && (
              <NavLink
                to="/settings"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex w-full items-center gap-md px-md py-sm font-body-md text-body-md transition-colors ${
                    isActive
                      ? 'bg-primary/10 font-bold text-primary'
                      : 'text-secondary-fixed-dim hover:bg-surface-variant/10 hover:text-secondary-fixed dark:text-on-surface-variant dark:hover:text-on-surface'
                  }`
                }
              >
                <Icon name="settings" />
                <span>Configuración</span>
              </NavLink>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-md px-md py-sm font-body-md text-body-md text-secondary-fixed-dim transition-colors hover:bg-surface-variant/10 hover:text-secondary-fixed dark:text-on-surface-variant dark:hover:text-on-surface"
            >
              <Icon name="logout" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
