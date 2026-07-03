import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, getUserFacingApiError } from '../api/client'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/ui/Logo'
import { Modal } from '../components/ui/Modal'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { isLoggedIn, useAuth } from '../hooks/useAuth'
import { buildCheckoutRegisterUrl } from '../utils/checkoutAuth'

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
      <div className="flex flex-col items-start gap-y-xs sm:flex-row sm:items-center sm:justify-between">
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const resumeCheckout = searchParams.get('resumeCheckout') === '1'
  const registered = (location.state as { registered?: boolean; email?: string } | null)?.registered
  const [email, setEmail] = useState(
    () => searchParams.get('email') ?? (location.state as { email?: string } | null)?.email ?? '',
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  if (isLoggedIn()) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password, { returnTo, resumeCheckout })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Correo o contraseña incorrectos.')
      } else {
        setError(getUserFacingApiError(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-sm py-md sm:p-md">
      <main className="relative z-10 w-full max-w-[440px]">
        <div className="auth-card relative space-y-lg rounded-lg p-lg sm:p-xl">
          <div className="flex items-center justify-between gap-sm">
            <Link
              to="/chatbot"
              className="flex min-w-0 items-center gap-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="arrow_back" size={18} className="shrink-0" />
              Volver al inicio
            </Link>
            <ThemeToggle variant="inline" className="shrink-0" />
          </div>
          <header className="flex flex-col items-center gap-sm text-center">
            <div className="flex w-full max-w-[11rem] items-center justify-center rounded-lg bg-primary-container p-md sm:max-w-[13rem] sm:p-lg">
              <Logo
                size="lg"
                iconClassName="h-16 w-full max-w-full object-contain sm:h-20"
              />
            </div>
            <h1 className="font-headline-md text-headline-md font-extrabold text-on-surface">
              El Plonsazo
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Acceso a la Suite Empresarial
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-md">
            {resumeCheckout && (
              <p className="rounded-lg border border-primary/30 bg-primary-container/30 px-md py-sm font-body-sm text-body-sm text-on-surface">
                Para confirmar tu pedido, inicia sesión o regístrate. Tu carrito se conservará al volver al chat.
              </p>
            )}

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
                  onClick={() => setForgotOpen(true)}
                  className="text-left font-body-sm text-body-sm text-primary transition-all hover:underline sm:font-label-md sm:text-label-md"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              }
            />

            {error && (
              <p className="font-body-sm text-body-sm text-error" role="alert">
                {error}
              </p>
            )}

            <div className="pt-md">
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-sm rounded bg-primary font-headline-sm text-headline-sm text-on-primary transition-all duration-200 hover:bg-primary-dim active:scale-[0.98] disabled:opacity-60"
              >
                <span>{loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}</span>
                <Icon name="login" />
              </button>
            </div>
          </form>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            ¿No tienes cuenta?{' '}
            <Link
              to={resumeCheckout ? buildCheckoutRegisterUrl() : '/register'}
              className="font-semibold text-primary transition-colors hover:underline"
            >
              Registrarse
            </Link>
          </p>

          <footer className="flex flex-col items-center space-y-md border-t border-outline-variant pt-lg">
            <div className="flex flex-col items-center gap-sm text-center sm:flex-row sm:gap-md">
              <div className="flex items-center gap-xs">
                <Icon name="verified_user" size={16} className="text-primary" />
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">
                  Conexión Segura (TLS)
                </span>
              </div>
              <div className="hidden h-3 w-px bg-outline-variant sm:block" />
              <div className="flex items-center gap-xs">
                <Icon name="shield" size={16} className="text-primary" />
                <span className="font-body-sm text-body-sm text-on-surface-variant/80">
                  Cumplimiento SOC2
                </span>
              </div>
            </div>
          </footer>
        </div>

        <nav className="mt-lg flex flex-col items-center gap-sm px-sm text-center font-label-md text-label-md text-on-surface-variant/60 sm:mt-xl sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-lg sm:gap-y-sm">
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

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Recuperación de contraseña"
        icon="lock_reset"
        footer={
          <div className="flex gap-md">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="flex-1 rounded-lg border border-outline-variant py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-high"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotOpen(false)
                navigate('/support')
              }}
              className="flex-1 rounded-lg bg-primary py-2 font-label-md text-label-md text-on-primary hover:opacity-90"
            >
              Ir a Soporte
            </button>
          </div>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          La recuperación de contraseña está gestionada por el administrador del sistema. Contacta con soporte para
          solicitar un restablecimiento de acceso.
        </p>
      </Modal>
    </div>
  )
}
