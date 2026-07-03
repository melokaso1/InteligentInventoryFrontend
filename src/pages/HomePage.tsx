import { isAdmin } from '../hooks/useAuth'
import { ClientDashboardPage } from './ClientDashboardPage'
import { DashboardPage } from './DashboardPage'

export function HomePage() {
  return isAdmin() ? <DashboardPage /> : <ClientDashboardPage />
}
