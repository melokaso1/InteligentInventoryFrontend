import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { isLoggedIn, useAuth } from '../hooks/useAuth'

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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  if (isLoggedIn()) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    register({ name, email, password })
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-md">
      <ThemeToggle variant="floating" />

      <main className="relative z-10 w-full max-w-[440px]">
        <div className="auth-card space-y-lg rounded-lg p-xl">
          <header className="flex flex-col items-center space-y-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary">
              <Icon name="person_add" filled className="text-white dark:text-on-primary" size={28} />
            </div>
            <div className="text-center">
              <h1 className="font-headline-md text-headline-md text-on-surface">El Plonsazo</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Crear cuenta en la Suite Empresarial
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-md">
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
                className="flex h-12 w-full items-center justify-center gap-sm rounded bg-primary font-headline-sm text-headline-sm text-on-primary transition-all duration-200 hover:bg-primary-dim active:scale-[0.98]"
              >
                <span>Crear cuenta</span>
                <Icon name="how_to_reg" />
              </button>
            </div>
          </form>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-primary transition-colors hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
