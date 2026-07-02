import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider } from '../../hooks/useSidebar'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const searchPlaceholders: Record<string, string> = {
  '/': 'Buscar datos...',
  '/products': 'Buscar en catálogo...',
  '/inventory': 'Buscar SKU o producto...',
  '/sales': 'Buscar ventas, clientes o artículos...',
  '/invoices': 'Buscar por nº de factura...',
  '/chatbot': 'Buscar pedidos, inventario...',
  '/reports': 'Buscar informes...',
  '/support': 'Buscar en ayuda...',
}

function AppLayoutContent() {
  const location = useLocation()
  const placeholder = searchPlaceholders[location.pathname] ?? 'Buscar datos...'
  const isInvoices = location.pathname === '/invoices'
  const isChatbot = location.pathname === '/chatbot'

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-background font-body-md text-on-surface antialiased">
      <Sidebar />
      <Header searchPlaceholder={placeholder} />
      <main
        className={`min-w-0 max-w-full min-h-[calc(100vh-4rem)] lg:ml-sidebar-width ${
          isInvoices
            ? 'flex min-h-[calc(100vh-4rem)] flex-col overflow-x-hidden overflow-y-auto p-0 lg:h-[calc(100vh-4rem)] lg:overflow-hidden'
            : isChatbot
              ? 'flex h-[calc(100vh-4rem)] flex-col overflow-x-hidden overflow-hidden p-0'
              : 'overflow-x-hidden p-md md:p-xl'
        }`}
      >
        {isInvoices || isChatbot ? (
          <Outlet />
        ) : (
          <div className="mx-auto min-w-0 w-full max-w-7xl">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  )
}
