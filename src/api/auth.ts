import { apiFetch } from './client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'cliente'
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(data: {
  name: string
  email: string
  password: string
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/auth/me')
}
