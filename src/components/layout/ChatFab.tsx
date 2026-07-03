import { Link, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../../hooks/useAuth'
import { useAnyOverlayOpen } from '../../hooks/useOverlayLock'
import { Icon } from '../ui/Icon'

function shouldShowChatFab(pathname: string): boolean {
  if (!isLoggedIn()) return false
  if (pathname === '/chatbot' || pathname.startsWith('/chatbot/')) return false
  return true
}

export function useChatFabVisible(): boolean {
  const { pathname } = useLocation()
  const overlayOpen = useAnyOverlayOpen()
  return shouldShowChatFab(pathname) && !overlayOpen
}

export function ChatFab() {
  if (!useChatFabVisible()) {
    return null
  }

  return (
    <Link
      to="/chatbot"
      aria-label="Abrir chat de ayuda"
      className="fixed bottom-lg right-md z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition-transform hover:scale-105 active:scale-95 sm:right-lg"
    >
      <Icon name="chat_bubble" size={28} />
    </Link>
  )
}
