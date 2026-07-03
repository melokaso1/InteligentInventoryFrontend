import type { ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider } from '../../hooks/useSidebar'
import { ChatFab, useChatFabVisible } from './ChatFab'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppLayoutContentProps {
  children?: ReactNode
}

function AppLayoutContent({ children }: AppLayoutContentProps) {
  const location = useLocation()
  const isInvoices = location.pathname === '/invoices'
  const isChatbot = location.pathname === '/chatbot'
  const chatFabVisible = useChatFabVisible()
  const pageContent = children ?? <Outlet />

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-background font-body-md text-on-surface antialiased">
      <Sidebar />
      <Header />
      <main
        className={`min-w-0 max-w-full min-h-[calc(100vh-4rem)] lg:ml-sidebar-width ${
          isInvoices
            ? 'flex min-h-[calc(100vh-4rem)] flex-col overflow-x-hidden overflow-y-auto p-0 lg:h-[calc(100vh-4rem)] lg:overflow-hidden'
            : isChatbot
              ? 'flex h-[calc(100vh-4rem)] flex-col overflow-x-hidden overflow-hidden p-0'
              : `overflow-x-hidden p-md md:p-xl${chatFabVisible ? ' pb-20' : ''}`
        }`}
      >
        {isInvoices || isChatbot ? (
          pageContent
        ) : (
          <div className="mx-auto min-w-0 w-full max-w-full lg:max-w-7xl">
            {pageContent}
          </div>
        )}
      </main>
      <ChatFab />
    </div>
  )
}

export function AppLayoutFrame({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  )
}
