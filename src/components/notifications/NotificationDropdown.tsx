import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useNavigate } from 'react-router-dom'

import type { AppNotification } from '../../types'

import { fetchNotifications, markNotificationRead } from '../../api'

import { Icon } from '../ui/Icon'

import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh'

import { notifyDataMutation } from '../../utils/dataSync'

import { formatDate } from '../../utils/format'

import { getUserFacingApiError } from '../../api/client'

import { isAdmin } from '../../hooks/useAuth'

import { getNotificationTargetPath } from '../../utils/notificationNavigation'



function formatNotificationTime(iso: string) {

  try {

    const date = new Date(iso)

    return date.toLocaleString('es-CO', {

      day: '2-digit',

      month: 'short',

      hour: '2-digit',

      minute: '2-digit',

    })

  } catch {

    return formatDate(iso)

  }

}



export function NotificationDropdown() {

  const navigate = useNavigate()

  const [open, setOpen] = useState(false)

  const [unreadCount, setUnreadCount] = useState(0)

  const [items, setItems] = useState<AppNotification[]>([])

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const buttonRef = useRef<HTMLButtonElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)



  const loadNotifications = useCallback(async () => {

    setLoading(true)

    setError(null)

    try {

      const result = await fetchNotifications()

      setUnreadCount(result.unreadCount)

      setItems(result.items)

    } catch (err) {

      setError(getUserFacingApiError(err, 'No se pudieron cargar las notificaciones.'))

    } finally {

      setLoading(false)

    }

  }, [])



  useEffect(() => {

    void loadNotifications()

  }, [loadNotifications])



  useRealtimeRefresh(loadNotifications, [loadNotifications], {

    scope: ['notifications', 'orders'],

    intervalMs: 15_000,

  })



  const updatePanelPosition = useCallback(() => {

    const button = buttonRef.current

    if (!button) return



    const rect = button.getBoundingClientRect()

    setPanelStyle({

      position: 'fixed',

      top: rect.bottom + 8,

      right: Math.max(16, window.innerWidth - rect.right),

      width: Math.min(window.innerWidth - 32, 352),

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



  const handleOpen = () => {

    setOpen((prev) => !prev)

    if (!open) void loadNotifications()

  }



  const handleItemClick = async (notification: AppNotification) => {

    if (!notification.isRead) {

      try {

        await markNotificationRead(notification.id)

        notifyDataMutation('notifications')

        void loadNotifications()

      } catch {

        // Keep navigation even if mark-read fails

      }

    }



    setOpen(false)

    if (notification.saleId) {

      navigate('/my-orders')

    }

  }



  const panel = open ? (

    <div

      ref={panelRef}

      style={panelStyle}

      className="dark overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-lg"

    >

      <div className="border-b border-outline-variant bg-surface-container-high px-md py-sm">

        <p className="font-label-md text-label-md font-semibold text-on-surface">Notificaciones</p>

      </div>

      <div className="max-h-80 overflow-y-auto custom-scrollbar">

        {loading ? (

          <p className="px-md py-lg text-center text-body-sm text-on-surface-variant">Cargando…</p>

        ) : error ? (

          <p className="px-md py-lg text-center text-body-sm text-error">{error}</p>

        ) : items.length === 0 ? (

          <p className="px-md py-lg text-center text-body-sm text-on-surface-variant">

            No tienes notificaciones

          </p>

        ) : (

          <ul>

            {items.map((item) => (

              <li key={item.id}>

                <button

                  type="button"

                  onClick={() => void handleItemClick(item)}

                  className={`w-full border-b border-outline-variant/40 px-md py-sm text-left transition-colors hover:bg-surface-container-high ${

                    item.isRead ? 'opacity-70' : 'bg-primary/10'

                  }`}

                >

                  <p className="font-label-md text-label-md font-semibold text-on-surface">{item.title}</p>

                  <p className="mt-0.5 text-body-sm text-on-surface-variant">{item.message}</p>

                  <p className="mt-1 text-[11px] text-on-surface-variant/80">

                    {formatNotificationTime(item.createdAt)}

                  </p>

                </button>

              </li>

            ))}

          </ul>

        )}

      </div>

    </div>

  ) : null



  return (

    <div className="relative">

      <button

        ref={buttonRef}

        type="button"

        aria-label="Notificaciones"

        aria-expanded={open}

        onClick={handleOpen}

        className="relative inline-flex shrink-0 p-0 leading-none text-on-surface-variant transition-colors hover:text-primary"

      >

        <span className="relative inline-flex">

          <Icon name="notifications" />

          {unreadCount > 0 && (

            <span

              aria-hidden

              className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-0.5 text-[10px] font-bold leading-none text-on-error"

            >

              {unreadCount > 9 ? '9+' : unreadCount}

            </span>

          )}

        </span>

      </button>



      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : panel}

    </div>

  )

}


