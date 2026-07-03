import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyOrders } from '../api'
import { PageHelpCard } from '../components/ui/PageHelpCard'
import { Icon } from '../components/ui/Icon'
import { getCurrentUser } from '../hooks/useAuth'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh'

const quickLinks = [
  {
    to: '/chatbot',
    icon: 'smart_toy',
    title: 'Comprar con Drogui',
    description: 'Consulta stock, busca productos y confirma tu pedido en el chat.',
  },
  {
    to: '/my-orders',
    icon: 'local_shipping',
    title: 'Mis pedidos',
    description: 'Sigue el envío y confirma cuando recibas tu compra.',
  },
  {
    to: '/my-invoices',
    icon: 'receipt_long',
    title: 'Mis facturas',
    description: 'Consulta el detalle y paga tus facturas pendientes.',
  },
] as const

export function ClientDashboardPage() {
  const userName = getCurrentUser()?.name?.split(' ')[0] ?? 'Cliente'
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0)

  const loadPendingShippedOrders = useCallback(async () => {
    try {
      const result = await fetchMyOrders({ pageSize: 1, fulfillmentStatus: 'shipped' })
      setPendingConfirmCount(result.totalCount)
    } catch {
      // Keep previous count if fetch fails.
    }
  }, [])

  useEffect(() => {
    void loadPendingShippedOrders()
  }, [loadPendingShippedOrders])

  useRealtimeRefresh(loadPendingShippedOrders, [loadPendingShippedOrders], {
    scope: ['orders', 'notifications'],
  })

  return (
    <div className="min-w-0 w-full max-w-full space-y-gutter">
      <div className="rounded-xl border border-outline-variant bg-surface p-md shadow-sm md:p-gutter">
        <h1 className="text-headline-sm font-bold text-on-background md:font-display-lg md:text-display-lg">
          Hola, {userName}
        </h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Bienvenido a El Plonsazo. Desde aquí puedes comprar, pagar facturas y rastrear tus pedidos.
        </p>
      </div>

      {pendingConfirmCount > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-sm rounded-xl border border-warning-container bg-warning-container/30 px-lg py-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-sm">
            <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-warning" />
            <p className="font-body-sm text-body-sm text-on-warning-container">
              Tienes pedidos sin confirmar el recibido
              {pendingConfirmCount > 1
                ? ` (${pendingConfirmCount} pedidos enviados)`
                : ''}
            </p>
          </div>
          <Link
            to="/my-orders"
            className="shrink-0 rounded-lg border border-warning-container bg-warning-container/50 px-md py-sm font-label-md text-label-md text-on-warning-container transition-colors hover:bg-warning-container/70"
          >
            Ver mis pedidos →
          </Link>
        </div>
      )}

      <PageHelpCard
        storageKey="client-dashboard"
        icon="waving_hand"
        title="¿Por dónde empiezo?"
        intro="Tres pasos habituales después de iniciar sesión:"
        steps={[
          <>
            Abre el <strong>Chatbot</strong> y pide lo que necesitas en lenguaje natural.
          </>,
          <>
            Revisa <strong>Mis facturas</strong> para pagar con el método que prefieras.
          </>,
          <>
            En <strong>Mis pedidos</strong> verás si tu compra está en preparación, enviada o entregada.
          </>,
        ]}
        tip={
          <>
            ¿Primera vez? En el chatbot verás la guía <strong>¿Cómo comprar?</strong> a la derecha (o el botón de ayuda en móvil).
          </>
        }
      />

      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm transition-shadow hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={link.icon} size={22} />
            </div>
            <h2 className="mt-md font-headline-sm text-headline-sm text-on-surface">{link.title}</h2>
            <p className="mt-1 flex-1 text-body-sm text-on-surface-variant">{link.description}</p>
            <span className="mt-md font-label-md text-label-md text-primary">Ir →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
