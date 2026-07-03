import { AppLayoutFrame } from '../layout/AppLayout'
import { isLoggedIn } from '../../hooks/useAuth'
import { SupportPage } from '../../pages/SupportPage'

export function SupportRoute() {
  if (!isLoggedIn()) {
    return (
      <div className="min-h-screen bg-background px-md py-xl font-body-md text-on-surface antialiased md:px-xl">
        <div className="mx-auto max-w-5xl">
          <SupportPage />
        </div>
      </div>
    )
  }

  return (
    <AppLayoutFrame>
      <SupportPage />
    </AppLayoutFrame>
  )
}
