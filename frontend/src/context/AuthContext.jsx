/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentUserRequest, loginRequest, signupRequest } from '../utils/api'

const AuthContext = createContext(null)

const STORAGE_USER_KEY = 'wfcts_user'
const STORAGE_TOKEN_KEY = 'wfcts_token'

function readStoredUser() {
  try {
    const saved = localStorage.getItem(STORAGE_USER_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_USER_KEY)
  localStorage.removeItem(STORAGE_TOKEN_KEY)
}

function persistSession(user, token) {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
  localStorage.setItem(STORAGE_TOKEN_KEY, token)
}

export function getHomeRouteByRole(role) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'HOD') return '/hod/dashboard'
  return '/dashboard'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || '')
  const [authReady, setAuthReady] = useState(false)

  const isAuthenticated = Boolean(user && token)

  useEffect(() => {
    let ignore = false

    async function restoreSession() {
      if (!token) {
        clearStoredSession()
        if (!ignore) {
          setUser(null)
          setAuthReady(true)
        }
        return
      }

      try {
        const response = await getCurrentUserRequest(token)
        if (ignore) return

        persistSession(response.user, token)
        setUser(response.user)
      } catch {
        if (ignore) return

        clearStoredSession()
        setUser(null)
        setToken('')
      } finally {
        if (!ignore) {
          setAuthReady(true)
        }
      }
    }

    restoreSession()

    return () => {
      ignore = true
    }
  }, [token])

  const login = useCallback(async (credentials) => {
    const response = await loginRequest(credentials)
    persistSession(response.user, response.token)
    setUser(response.user)
    setToken(response.token)
    setAuthReady(true)
    return response.user
  }, [])

  const signup = useCallback(async (payload) => {
    const response = await signupRequest(payload)
    persistSession(response.user, response.token)
    setUser(response.user)
    setToken(response.token)
    setAuthReady(true)
    return response.user
  }, [])

  const logout = useCallback(() => {
    clearStoredSession()
    setUser(null)
    setToken('')
    setAuthReady(true)
  }, [])

  const value = useMemo(
    () => ({ user, token, isAuthenticated, authReady, login, signup, logout }),
    [user, token, isAuthenticated, authReady, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
