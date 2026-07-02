import { Navigate, Outlet } from 'react-router-dom'
import { getRole, isLoggedIn } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  adminOnly?: boolean
}

export function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && getRole() !== 'admin') {
    return <Navigate to="/chatbot" replace />
  }

  return <Outlet />
}
