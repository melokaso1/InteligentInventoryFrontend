import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { isLoggedIn, useAuth } from '../hooks/useAuth'

const FOOTER_LINKS = ['Términos de Servicio', 'Política de Privacidad', 'Soporte TI'] as const

function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  trailing,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: string
  trailing?: ReactNode
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="space-y-xs">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-label-md text-label-md uppercase text-on-surface-variant">
          {label}
        </label>
        {trailing}
      </div>
      <div className="relative">
        <Icon
          name={icon}
          className={`absolute left-md top-1/2 -translate-y-1/2 transition-colors ${
            focused ? 'text-primary' : 'text-on-surface-variant/60'
          }`}
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="input-focus-ring h-12 w-full rounded border border-outline-variant bg-surface-container-lowest pl-12 pr-md font-body-md text-body-md text-on-surface transition-all placeholder:text-on-surface-variant/40 dark:bg-surface-container"
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const registered = (location.state as { registered?: boolean; email?: string } | null)?.registered
  const [email, setEmail] = useState(
    () => (location.state as { email?: string } | null)?.email ?? '',
  )
  const [password, setPassword] = useState('')

  if (isLoggedIn()) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    login()
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-md">
      <ThemeToggle variant="floating" />

      <main className="relative z-10 w-full max-w-[440px]">
        <div className="auth-card space-y-lg rounded-lg p-xl">
          <header className="flex flex-col items-center space-y-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
              <Icon name="admin_panel_settings" filled className="text-white dark:text-on-primary" size={28} />
            </div>
            <div className="text-center">
              <h1 className="font-headline-md text-headline-md text-on-surface">El Plonsazo</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Acceso Administrador de Suite Empresarial
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-md">
            {registered && (
              <p className="rounded-lg border border-primary/30 bg-primary-container/30 px-md py-sm font-body-sm text-body-sm text-on-surface">
                Cuenta creada correctamente. Inicia sesión para continuar.
              </p>
            )}

            <InputField
              id="email"
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="ejemplo@empresa.com"
              icon="mail"
            />

            <InputField
              id="password"
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              icon="lock"
              trailing={
                <button
                  type="button"
                  className="font-label-md text-label-md text-primary transition-all hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              }
            />

            <div className="pt-md">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-sm rounded bg-primary font-headline-sm text-headline-sm text-on-primary transition-all duration-200 hover:bg-primary-dim active:scale-[0.98]"
              >
                <span>Iniciar Sesión</span>
                <Icon name="login" />
              </button>
            </div>
          </form>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-primary transition-colors hover:underline">
              Registrarse
            </Link>
          </p>

          <footer className="flex flex-col items-center space-y-md border-t border-outline-variant pt-lg">
            <div className="flex items-center space-x-md">
              <div className="flex items-center space-x-xs">
                <Icon name="verified_user" size={16} className="text-primary" />
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">
                  Conexión Segura (TLS)
                </span>
              </div>
              <div className="h-3 w-px bg-outline-variant" />
              <div className="flex items-center space-x-xs">
                <Icon name="shield" size={16} className="text-primary" />
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">
                  Cumplimiento SOC2
                </span>
              </div>
            </div>
            <p className="text-center font-mono-sm text-[11px] uppercase tracking-wider text-on-surface-variant/50">
              Sistema de Gestión de Recursos Empresariales v4.2.0
            </p>
          </footer>
        </div>

        <nav className="mt-xl flex justify-center space-x-xl font-label-md text-label-md text-on-surface-variant/60">
          {FOOTER_LINKS.map((label) => (
            <button
              key={label}
              type="button"
              className="transition-colors hover:text-primary"
            >
              {label}
            </button>
          ))}
        </nav>
      </main>
    </div>
  )
}
