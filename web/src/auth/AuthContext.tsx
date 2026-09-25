import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'

export type Role = 'admin' | 'user'

export type SessionUser = {
  username: string
  role: Role
  token: string
}

type AuthContextValue = {
  user: SessionUser | null
  login: (username: string, password: string) => Promise<string | null>
  logout: () => void
  authHeaders: Record<string, string>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'iskele.session.v4'

function readStored(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionUser
    if (!parsed?.token || !parsed?.username) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readStored())

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await api<{
        access_token: string
        role: Role
        username: string
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      const session: SessionUser = {
        username: data.username,
        role: data.role,
        token: data.access_token,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      setUser(session)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Login failed'
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const authHeaders = useMemo(
    () => (user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
    [user],
  )

  const value = useMemo(
    () => ({ user, login, logout, authHeaders }),
    [user, login, logout, authHeaders],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
