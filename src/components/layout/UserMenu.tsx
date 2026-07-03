import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getCurrentUser, isAdmin, useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { useTheme } from '../../hooks/useTheme'
import { getNotificationTargetPath } from '../../utils/notificationNavigation'
import {
  formatNotificationTime,
  getNotificationIcon,
} from '../notifications/notificationUtils'
import { Icon } from '../ui/Icon'

type UserMenuProps = {
  loggedIn: boolean
}

export function UserMenu({ loggedIn }: UserMenuProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const user = getCurrentUser()
  const isGuestOnChatbot = !loggedIn && location.pathname === '/chatbot'

  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const {
    unreadCount,
    items,
    loading,
    clearing,
    error,
    loadNotifications,
    markRead,
    clearAll,
  } = useNotifications(loggedIn)

  const updatePanelPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      right: Math.max(16, window.innerWidth - rect.right),
      width: Math.min(window.innerWidth - 32, 320),
      zIndex: 60,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [open, updatePanelPosition])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next && loggedIn) void loadNotifications()
      return next
    })
  }

  const handleNotificationClick = async (notification: (typeof items)[number]) => {
    await markRead(notification)
    setOpen(false)
    const target = getNotificationTargetPath(notification, isAdmin())
    if (target) navigate(target)
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  const handleThemeToggle = () => {
    toggleTheme()
  }

  const panel = open ? (
    <div
      ref={panelRef}
      style={panelStyle}
      role="menu"
      aria-label="Menú de usuario"
      className="dark overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-lg"
    >
      <div className="border-b border-outline-variant bg-surface-container-high px-md py-sm">
        {loggedIn && user ? (
          <div className="min-w-0">
            <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
              {user.name}
            </p>
            <p className="truncate text-body-sm text-on-surface-variant">{user.email}</p>
          </div>
        ) : (
          <p className="font-label-md text-label-md font-semibold text-on-surface">
            {isGuestOnChatbot ? 'Invitado' : 'Sesión no iniciada'}
          </p>
        )}
      </div>

      {loggedIn && (
        <div className="border-b border-outline-variant">
          <div className="flex items-center justify-between px-md py-sm">
            <span className="flex items-center gap-xs font-label-md text-label-md font-semibold text-on-surface">
              <Icon name="notifications" size={18} className="text-primary" />
              Notificaciones
              {unreadCount > 0 && (
                <span className="rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold leading-none text-on-error">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {items.length > 0 && !loading ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => void clearAll()}
                disabled={clearing}
                className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? 'Limpiando…' : 'Limpiar'}
              </button>
            ) : null}
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="px-md py-md text-center text-body-sm text-on-surface-variant">Cargando…</p>
            ) : error ? (
              <p className="px-md py-md text-center text-body-sm text-error">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-md py-md text-center text-body-sm text-on-surface-variant">
                No tienes notificaciones
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleNotificationClick(item)}
                      className={`w-full border-b border-outline-variant/40 px-md py-sm text-left transition-colors hover:bg-surface-container-high ${
                        item.isRead ? 'opacity-70' : 'bg-primary/10'
                      }`}
                    >
                      <div className="flex items-start gap-sm">
                        <Icon
                          name={getNotificationIcon(item.type)}
                          size={18}
                          className="mt-0.5 shrink-0 text-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-label-md text-label-md font-semibold text-on-surface">
                            {item.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">
                            {item.message}
                          </p>
                          <p className="mt-1 text-[11px] text-on-surface-variant/80">
                            {formatNotificationTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="py-xs">
        <button
          type="button"
          role="menuitem"
          onClick={handleThemeToggle}
          className="flex w-full items-center gap-sm px-md py-sm text-left font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={20} className="text-on-surface-variant" />
          <span className="flex-1">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
          <Icon name="chevron_right" size={18} className="text-on-surface-variant/60" />
        </button>

        {loggedIn ? (
          <>
            <NavLink
              to="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-sm px-md py-sm font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Icon name="settings" size={20} className="text-on-surface-variant" />
              <span className="flex-1">Configuración</span>
            </NavLink>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-sm px-md py-sm text-left font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Icon name="logout" size={20} className="text-on-surface-variant" />
              <span className="flex-1">Cerrar sesión</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-sm px-md py-sm font-body-md text-body-md text-primary transition-colors hover:bg-primary/10"
          >
            <Icon name="login" size={20} />
            <span className="flex-1">Iniciar sesión</span>
          </NavLink>
        )}
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          loggedIn && unreadCount > 0
            ? `Menú de usuario, ${unreadCount} notificación${unreadCount === 1 ? '' : 'es'} sin leer`
            : 'Menú de usuario'
        }
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={handleToggle}
        className="group inline-flex shrink-0 items-center gap-0.5 rounded-full p-0.5 text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span className="relative inline-flex">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-surface-container-high ring-2 transition-all group-hover:border-primary/40 group-hover:ring-primary/20 ${
              open
                ? 'border-primary/50 ring-primary/30'
                : 'border-outline-variant ring-transparent'
            }`}
          >
            <Icon name="account_circle" size={24} />
          </span>
          {loggedIn && unreadCount > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-surface bg-error shadow-sm" />
            </span>
          )}
        </span>
        <Icon
          name="expand_more"
          size={18}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : panel}
    </div>
  )
}
