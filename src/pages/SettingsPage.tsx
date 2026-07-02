import { Link } from 'react-router-dom'
import { getCurrentUser } from '../hooks/useAuth'
import { Icon } from '../components/ui/Icon'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
}

export function SettingsPage() {
  const user = getCurrentUser()

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="font-display-lg text-display-lg text-on-surface">Configuración</h1>
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
          Perfil de usuario y preferencias del sistema.
        </p>
      </div>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Perfil</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Información de tu cuenta (solo lectura).
        </p>

        <dl className="mt-lg grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <dt className="text-label-md uppercase text-on-surface-variant">Nombre</dt>
            <dd className="mt-1 font-body-md text-on-surface">{user?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-label-md uppercase text-on-surface-variant">Correo</dt>
            <dd className="mt-1 font-body-md text-on-surface">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-label-md uppercase text-on-surface-variant">Rol</dt>
            <dd className="mt-1 font-body-md text-on-surface">
              {user?.role ? (roleLabels[user.role] ?? user.role) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Preferencias</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Las preferencias avanzadas estarán disponibles en una próxima versión.
        </p>
        <ul className="mt-md space-y-sm text-body-sm text-on-surface-variant">
          <li className="flex items-center gap-sm">
            <Icon name="dark_mode" size={18} />
            Tema: usa el interruptor en la barra superior
          </li>
          <li className="flex items-center gap-sm">
            <Icon name="language" size={18} />
            Idioma: Español (Colombia)
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Ayuda</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Para cambios de contraseña, permisos o incidencias técnicas, contacta con soporte.
        </p>
        <Link
          to="/support"
          className="mt-md inline-flex items-center gap-sm rounded-lg bg-primary px-md py-2 font-label-md text-label-md text-on-primary hover:opacity-90"
        >
          <Icon name="support_agent" size={18} />
          Ir a Soporte
        </Link>
      </section>
    </div>
  )
}
