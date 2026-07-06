import { type FormEvent, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ApiError, getUserFacingApiError } from '../api/client'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/ui/Logo'
import { PasswordChecklist } from '../components/ui/PasswordChecklist'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { getHomePath, isLoggedIn, useAuth } from '../hooks/useAuth'
import { validatePassword } from '../utils/password'

function InputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="space-y-xs">
      <label htmlFor={id} className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </label>
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

export function RegisterPage() {
  const { register } = useAuth()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const resumeCheckout = searchParams.get('resumeCheckout') === '1'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoggedIn()) {
    return <Navigate to={getHomePath()} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (!name.trim()) {
      setError('El nombre completo es obligatorio.')
      return
    }

    const validationError = validatePassword(password)
    if (validationError) {
      setError(`La contraseña no cumple los requisitos: ${validationError}.`)
      return
    }

    setLoading(true)
    try {
      await register({ name, email, password }, { returnTo, resumeCheckout })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(err.message || 'Ya existe una cuenta con ese correo electrónico.')
      } else {
        setError(getUserFacingApiError(err, 'No se pudo crear la cuenta. Inténtalo de nuevo.'))
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
              Crear cuenta en la Suite Empresarial
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-md">
            {resumeCheckout ? (
              <p className="rounded-lg border border-primary/30 bg-primary-container/30 px-md py-sm font-body-sm text-body-sm text-on-surface">
                Crea tu cuenta para confirmar el pedido. Al iniciar sesión, volverás al chat con tu carrito intacto.
              </p>
            ) : null}

            <InputField
              id="name"
              label="Nombre Completo"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Juan Pérez"
              icon="badge"
            />

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
            />

            {password.length > 0 ? (
              <PasswordChecklist password={password} className="rounded-lg border border-outline-variant/50 bg-surface-container-low/50 p-sm" />
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.
              </p>
            )}

            <InputField
              id="confirmPassword"
              label="Confirmar Contraseña"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
              icon="lock"
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
                <span>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</span>
                <Icon name="how_to_reg" />
              </button>
            </div>
          </form>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            ¿Ya tienes cuenta?{' '}
            <Link
              to={
                returnTo || resumeCheckout
                  ? `/login?${new URLSearchParams({
                      ...(returnTo ? { returnTo } : {}),
                      ...(resumeCheckout ? { resumeCheckout: '1' } : {}),
                    }).toString()}`
                  : '/login'
              }
              className="font-semibold text-primary transition-colors hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
