import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { HomeOrChatbotRedirect } from './components/routing/HomeOrChatbotRedirect'
import { SupportRoute } from './components/routing/SupportRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

const ChatbotPage = lazy(() => import('./pages/ChatbotPage').then((m) => ({ default: m.ChatbotPage })))
const ClientInvoicesPage = lazy(() =>
  import('./pages/ClientInvoicesPage').then((m) => ({ default: m.ClientInvoicesPage })),
)
const DispatchPage = lazy(() => import('./pages/DispatchPage').then((m) => ({ default: m.DispatchPage })))
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage').then((m) => ({ default: m.MyOrdersPage })))
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-on-surface-variant">
      Cargando…
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/support" element={<SupportRoute />} />
          <Route element={<AppLayout />}>
            <Route path="chatbot" element={<ChatbotPage />} />
            <Route index element={<HomeOrChatbotRedirect />} />
            <Route element={<ProtectedRoute />}>
              <Route path="my-invoices" element={<ClientInvoicesPage />} />
              <Route path="my-orders" element={<MyOrdersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="products" element={<ProductsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="dispatch" element={<DispatchPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
