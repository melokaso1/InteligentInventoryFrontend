import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SUPPORT_CONTACT } from '../config/support'
import { Icon } from '../components/ui/Icon'
import { isAdmin, isLoggedIn } from '../hooks/useAuth'

const FAQ_ITEMS = [
  {
    id: 'password',
    question: '¿Cómo restablezco mi contraseña?',
    answer:
      'Ve a la pantalla de inicio de sesión y haz clic en "¿Olvidaste tu contraseña?". Recibirás instrucciones para contactar al administrador y restablecer tu acceso.',
  },
  {
    id: 'chatbot',
    question: '¿Cómo funciona el asistente de chatbot?',
    answer:
      'El chatbot consulta el inventario en tiempo real, puede buscar productos por SKU o nombre y ayudarte a registrar compras. Accede desde el menú lateral o el botón "Abrir chatbot".',
  },
  {
    id: 'stock',
    question: '¿Quién recibe las alertas de stock bajo?',
    answer:
      'Las alertas aparecen en el panel principal. Los responsables de inventario pueden revisar los productos con stock crítico en la sección de inventario.',
  },
] as const

const ADMIN_HELP_LINKS = [
  { label: 'Panel de control', to: '/', icon: 'dashboard' },
  { label: 'Inventario', to: '/inventory', icon: 'warehouse' },
  { label: 'Asistente IA', to: '/chatbot', icon: 'smart_toy' },
] as const

const CLIENT_HELP_LINKS = [
  { label: 'Asistente IA', to: '/chatbot', icon: 'smart_toy' },
  { label: 'Mis facturas', to: '/my-invoices', icon: 'receipt_long' },
] as const

export function SupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null)
  const loggedIn = isLoggedIn()
  const helpLinks = isAdmin() ? ADMIN_HELP_LINKS : CLIENT_HELP_LINKS

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="font-display-lg text-display-lg text-on-surface">Soporte</h1>
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
          Encuentra respuestas rápidas o contacta con nuestro equipo de ayuda.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-lg md:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <div className="mb-md w-fit rounded-lg bg-primary/10 p-sm text-primary">
            <Icon name="mail" />
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Correo de soporte</h2>
          <p className="mt-xs flex-1 font-body-sm text-body-sm text-on-surface-variant">
            Escríbenos para consultas técnicas o incidencias con el sistema.
          </p>
          <a
            href={`mailto:${SUPPORT_CONTACT.email}`}
            className="mt-md font-label-md text-label-md text-primary hover:underline"
          >
            {SUPPORT_CONTACT.email}
          </a>
        </div>
        <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <div className="mb-md w-fit rounded-lg bg-primary/10 p-sm text-primary">
            <Icon name="call" />
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Teléfono</h2>
          <p className="mt-xs flex-1 font-body-sm text-body-sm text-on-surface-variant">
            Horario de atención: {SUPPORT_CONTACT.hours}.
          </p>
          <a href={SUPPORT_CONTACT.phoneHref} className="mt-md font-label-md text-label-md text-primary hover:underline">
            {SUPPORT_CONTACT.phone}
          </a>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Preguntas frecuentes</h2>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaq === item.id
              const panelId = `faq-panel-${item.id}`
              const buttonId = `faq-button-${item.id}`

              return (
                <div key={item.id}>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-md px-lg py-md text-left transition-colors hover:bg-surface-container-low/50"
                  >
                    <span className="font-body-md font-bold text-on-surface">{item.question}</span>
                    <Icon
                      name={isOpen ? 'expand_less' : 'expand_more'}
                      className="shrink-0 text-on-surface-variant"
                    />
                  </button>
                  {isOpen && (
                    <p
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="px-lg pb-md font-body-sm text-body-sm text-on-surface-variant"
                    >
                      {item.answer}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {loggedIn ? (
          <section className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Enlaces de ayuda</h2>
            <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
              Accesos rápidos a recursos del sistema.
            </p>
            <ul className="mt-lg space-y-sm">
              {helpLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex w-full items-center gap-md rounded-lg px-md py-sm font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    <Icon name={link.icon} className="text-primary" size={20} />
                    {link.label}
                    <Icon name="chevron_right" className="ml-auto text-on-surface-variant" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-lg">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-md">
                <p className="font-body-md font-bold text-on-surface">¿Necesitas ayuda inmediata?</p>
                <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
                  Nuestro asistente IA puede resolver consultas sobre inventario y pedidos al instante.
                </p>
                <Link
                  to="/chatbot"
                  className="mt-md inline-flex items-center gap-xs rounded-lg bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
                >
                  <Icon name="smart_toy" size={18} />
                  Abrir chatbot
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-col justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">¿Necesitas acceder al sistema?</h2>
            <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
              Inicia sesión con tu cuenta para gestionar inventario, ventas y facturación.
            </p>
            <Link
              to="/login"
              className="mt-lg inline-flex w-fit items-center gap-xs rounded-lg bg-primary px-md py-sm font-label-md text-label-md text-on-primary transition-opacity hover:opacity-90"
            >
              <Icon name="login" size={18} />
              Volver al login
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
