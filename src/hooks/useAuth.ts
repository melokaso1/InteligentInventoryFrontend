import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { migrateGuestChatSessionOnLogin } from '../api'
import {
  attachChatSession,
  login as apiLogin,
  register as apiRegister,
  type AuthUser,
} from '../api/auth'
import { clearChatSession, getChatSessionId } from '../api'

const AUTH_KEY = 'erp-auth'
const TOKEN_KEY = 'erp-token'
const ROLE_KEY = 'erp-role'
const USER_KEY = 'erp-user'

export type ErpRole = 'admin' | 'cliente'

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthNavigationOptions {
  returnTo?: string | null
  resumeCheckout?: boolean
}

function persistAuth(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, user.role)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function updateStoredUser(token: string, user: AuthUser) {
  persistAuth(token, user)
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function resolvePostAuthPath(user: AuthUser, options?: AuthNavigationOptions): string {
  const returnTo = options?.returnTo?.trim()
  if (user.role === 'admin') {
    if (returnTo && returnTo !== '/chatbot') {
      return returnTo
    }
    return '/'
  }

  if (returnTo) {
    return returnTo
  }

  return '/chatbot'
}

export function useAuth() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true' && !!localStorage.getItem(TOKEN_KEY),
  )

  const login = useCallback(
    async (email: string, password: string, options?: AuthNavigationOptions) => {
      const guestSessionId = options?.resumeCheckout ? getChatSessionId() : null
      const result = await apiLogin(email, password)
      persistAuth(result.token, result.user)
      setIsAuthenticated(true)

      if (guestSessionId) {
        try {
          await attachChatSession(guestSessionId)
        } catch {
          // Continue even if attach fails (session may already belong to user).
        }
        migrateGuestChatSessionOnLogin(result.user.id)
      }

      navigate(resolvePostAuthPath(result.user, options), {
        state: options?.resumeCheckout ? { resumeCheckout: true } : undefined,
      })
    },
    [navigate],
  )

  const register = useCallback(
    async (data: RegisterData, options?: AuthNavigationOptions) => {
      await apiRegister(data)
      const params = new URLSearchParams()
      params.set('email', data.email)
      if (options?.returnTo) params.set('returnTo', options.returnTo)
      if (options?.resumeCheckout) params.set('resumeCheckout', '1')
      navigate(`/login?${params.toString()}`, { state: { registered: true, email: data.email } })
    },
    [navigate],
  )

  const logout = useCallback(() => {
    clearChatSession()
    clearAuth()
    setIsAuthenticated(false)
    navigate('/login')
  }, [navigate])

  return { isAuthenticated, login, register, logout }
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true' && !!localStorage.getItem(TOKEN_KEY)
}

export function getRole(): ErpRole {
  const role = localStorage.getItem(ROLE_KEY) as ErpRole | null
  return role === 'admin' ? 'admin' : 'cliente'
}

export function isAdmin(): boolean {
  return getRole() === 'admin'
}

export { clearChatSession } from '../api'

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}
