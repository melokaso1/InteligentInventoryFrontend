import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin, register as apiRegister, type AuthUser } from '../api/auth'

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

function persistAuth(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, user.role)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
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

export function useAuth() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true' && !!localStorage.getItem(TOKEN_KEY),
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiLogin(email, password)
      persistAuth(result.token, result.user)
      setIsAuthenticated(true)
      navigate(result.user.role === 'admin' ? '/' : '/chatbot')
    },
    [navigate],
  )

  const register = useCallback(
    async (data: RegisterData) => {
      await apiRegister(data)
      navigate('/login', { state: { registered: true, email: data.email } })
    },
    [navigate],
  )

  const logout = useCallback(() => {
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

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}
