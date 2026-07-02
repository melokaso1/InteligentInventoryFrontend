import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AUTH_KEY = 'erp-auth'
const ROLE_KEY = 'erp-role'
const USERS_KEY = 'erp-users'

export type ErpRole = 'admin' | 'user'

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface StoredUser extends RegisterData {
  id: string
  createdAt: string
}

// role: 'user' is reserved for future /app/* routes when a user portal design exists.
export function useAuth() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true',
  )

  const login = useCallback(() => {
    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(ROLE_KEY, 'admin')
    setIsAuthenticated(true)
    navigate('/')
  }, [navigate])

  const register = useCallback(
    (data: RegisterData) => {
      const users = getStoredUsers()
      const newUser: StoredUser = {
        ...data,
        id: `user-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      users.push(newUser)
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
      navigate('/login', { state: { registered: true, email: data.email } })
    },
    [navigate],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(ROLE_KEY)
    setIsAuthenticated(false)
    navigate('/login')
  }, [navigate])

  return { isAuthenticated, login, register, logout }
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function getRole(): ErpRole {
  return (localStorage.getItem(ROLE_KEY) as ErpRole) ?? 'admin'
}

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}
