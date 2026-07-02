import { useState } from 'react'
import { Link } from 'react-router-dom'
import { contactCards, faqItems } from '../data/mock'
import { Icon } from '../components/ui/Icon'

export function SupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0]?.id ?? null)

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="font-display-lg text-display-lg text-on-surface">Soporte</h1>
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
          Encuentra respuestas rápidas o contacta con nuestro equipo de ayuda.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
        {contactCards.map((card) => (
          <div
            key={card.id}
            className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-md rounded-lg bg-primary/10 p-sm text-primary w-fit">
              <Icon name={card.icon} />
            </div>
            <h2 className="font-headline-sm text-headline-sm">{card.title}</h2>
            <p className="mt-xs flex-1 font-body-sm text-body-sm text-on-surface-variant">
              {card.description}
            </p>
            <button
              type="button"
              className="mt-md text-left font-label-md text-label-md text-primary hover:underline"
            >
              {card.action}
            </button>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <h2 className="font-headline-sm text-headline-sm">Preguntas frecuentes</h2>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {faqItems.map((item) => {
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
            Accesos rápidos a recursos y herramientas del sistema.
          </p>
          <ul className="mt-lg space-y-sm">
            {[
              { label: 'Guía de inicio rápido', icon: 'rocket_launch' },
              { label: 'Centro de formación', icon: 'school' },
              { label: 'Estado del sistema', icon: 'monitor_heart' },
              { label: 'Política de privacidad', icon: 'policy' },
            ].map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  className="flex w-full items-center gap-md rounded-lg px-md py-sm font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <Icon name={link.icon} className="text-primary" size={20} />
                  {link.label}
                  <Icon name="chevron_right" className="ml-auto text-on-surface-variant" size={18} />
                </button>
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
