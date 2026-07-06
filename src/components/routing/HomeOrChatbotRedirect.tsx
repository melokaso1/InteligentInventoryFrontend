import { Navigate } from 'react-router-dom'
import { getHomePath } from '../../hooks/useAuth'
import { HomePage } from '../../pages/HomePage'

export function HomeOrChatbotRedirect() {
  const homePath = getHomePath()
  if (homePath !== '/') {
    return <Navigate to={homePath} replace />
  }

  return <HomePage />
}
