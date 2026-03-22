import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_USER_KEY = 'wfcts_user'
const STORAGE_TOKEN_KEY = 'wfcts_token'

function resolveRoleFromEmail(email) {
  const normalized = String(email || '').toLowerCase()
  if (normalized.includes('admin')) return 'ADMIN'
  if (normalized.includes('hod')) return 'HOD'
  return 'TEACHER'
}

export function getHomeRouteByRole(role) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'HOD') return '/hod/dashboard'
  return '/dashboard'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || '')

  const isAuthenticated = Boolean(user && token)

  function login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required.')
    }

    const role = resolveRoleFromEmail(email)
    const mockUser =
      role === 'TEACHER'
        ? { id: 'u1', name: 'Prof. Sharma', role: 'TEACHER' }
        : role === 'ADMIN'
          ? { id: 'u2', name: 'Admin User', role: 'ADMIN' }
          : { id: 'u3', name: 'HOD User', role: 'HOD' }

    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mockUser))
    localStorage.setItem(STORAGE_TOKEN_KEY, 'mock-jwt-token')
    setUser(mockUser)
    setToken('mock-jwt-token')
    return mockUser
  }

  function logout() {
    localStorage.removeItem(STORAGE_USER_KEY)
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    setUser(null)
    setToken('')
  }

  const value = useMemo(
    () => ({ user, token, isAuthenticated, login, logout }),
    [user, token, isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
