import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'

const FAQ_ITEMS = [
  {
    id: 'password',
    question: '¿Cómo restablezco mi contraseña?',
    answer:
      'Ve a la pantalla de inicio de sesión y haz clic en "¿Olvidaste tu contraseña?". Recibirás un enlace por correo para crear una nueva contraseña.',
  },
  {
    id: 'chatbot',
    question: '¿Cómo funciona el asistente de chatbot?',
    answer:
      'El chatbot consulta el inventario en tiempo real, puede buscar productos por SKU o nombre y ayudarte a registrar compras. Accede desde el menú lateral.',
  },
  {
    id: 'stock',
    question: '¿Quién recibe las alertas de stock bajo?',
    answer:
      'Las alertas aparecen en el panel principal. Los responsables de inventario pueden revisar los productos con stock crítico en la sección de inventario.',
  },
] as const

export function SupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null)

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
          <h2 className="font-headline-sm text-headline-sm">Correo de soporte</h2>
          <p className="mt-xs flex-1 font-body-sm text-body-sm text-on-surface-variant">
            Escríbenos para consultas técnicas o incidencias con el sistema.
          </p>
          <a
            href="mailto:soporte@smartinventory.ai"
            className="mt-md font-label-md text-label-md text-primary hover:underline"
          >
            soporte@smartinventory.ai
          </a>
        </div>
        <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <div className="mb-md w-fit rounded-lg bg-primary/10 p-sm text-primary">
            <Icon name="menu_book" />
          </div>
          <h2 className="font-headline-sm text-headline-sm">Documentación</h2>
          <p className="mt-xs flex-1 font-body-sm text-body-sm text-on-surface-variant">
            Guías de usuario y referencia de la API del proyecto SmartInventory AI.
          </p>
          <p className="mt-md font-label-md text-label-md text-on-surface-variant">
            Próximamente disponible
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <h2 className="font-headline-sm text-headline-sm">Preguntas frecuentes</h2>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaq === item.id
              return (
                <div key={item.id}>
                  <button
                    type="button"
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
                    <p className="px-lg pb-md font-body-sm text-body-sm text-on-surface-variant">
                      {item.answer}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <h2 className="font-headline-sm text-headline-sm">Enlaces de ayuda</h2>
          <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
            Accesos rápidos a recursos del sistema.
          </p>
          <ul className="mt-lg space-y-sm">
            {[
              { label: 'Panel de control', to: '/', icon: 'dashboard' },
              { label: 'Inventario', to: '/inventory', icon: 'warehouse' },
              { label: 'Asistente IA', to: '/chatbot', icon: 'smart_toy' },
            ].map((link) => (
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
      </div>
    </div>
  )
}
