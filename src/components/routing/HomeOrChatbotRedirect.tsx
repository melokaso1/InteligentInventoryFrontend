import { Navigate } from 'react-router-dom'
import { isLoggedIn } from '../../hooks/useAuth'
import { HomePage } from '../../pages/HomePage'

export function HomeOrChatbotRedirect() {
  if (!isLoggedIn()) {
    return <Navigate to="/chatbot" replace />
  }

  return <HomePage />
}
