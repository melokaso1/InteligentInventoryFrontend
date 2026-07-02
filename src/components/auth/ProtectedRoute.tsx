import { Navigate, Outlet } from 'react-router-dom'
import { isLoggedIn } from '../../hooks/useAuth'

export function ProtectedRoute() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
