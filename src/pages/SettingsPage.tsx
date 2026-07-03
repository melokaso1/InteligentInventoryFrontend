import { useState } from 'react'
import { Link } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { ApiError } from '../api/client'
import { PasswordChecklist } from '../components/ui/PasswordChecklist'
import { Toast } from '../components/ui/Toast'
import { Icon } from '../components/ui/Icon'
import { getCurrentUser } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { validatePassword } from '../utils/password'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
}

export function SettingsPage() {
  const user = getCurrentUser()
  const { toastMessage, showToast, dismissToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (changingPassword) return

    if (!currentPassword.trim()) {
      setPasswordFeedback({ type: 'error', message: 'Ingresa tu contraseña actual.' })
      return
    }

    const validationError = validatePassword(newPassword)
    if (validationError) {
      setPasswordFeedback({ type: 'error', message: `La contraseña no cumple los requisitos: ${validationError}.` })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'La confirmación no coincide con la nueva contraseña.' })
      return
    }

    setChangingPassword(true)
    setPasswordFeedback(null)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordFeedback(null)
      showToast('Contraseña actualizada correctamente.')
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo cambiar la contraseña.'
      setPasswordFeedback({ type: 'error', message })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-xl">
      <Toast message={toastMessage} onDismiss={dismissToast} />

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
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Seguridad</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Cambia tu contraseña. Debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo.
        </p>

        <form onSubmit={(e) => void handleChangePassword(e)} className="mt-lg space-y-md">
          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
            />
            {newPassword.length > 0 ? <PasswordChecklist password={newPassword} className="mt-2" /> : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface outline-none focus:border-primary"
            />
          </label>

          {passwordFeedback?.type === 'error' ? (
            <p className="text-body-sm text-error" role="alert">
              {passwordFeedback.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-lg bg-primary px-md py-2 font-label-md text-label-md text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changingPassword ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Preferencias</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Ajustes de la Suite El Plonsazo para operaciones en Colombia.
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
          <li className="flex items-center gap-sm">
            <Icon name="schedule" size={18} />
            Zona horaria: America/Bogotá (UTC−5)
          </li>
          <li className="flex items-center gap-sm">
            <Icon name="payments" size={18} />
            Moneda: Peso colombiano (COP)
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Ayuda</h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          Para permisos o incidencias técnicas, contacta con soporte.
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
