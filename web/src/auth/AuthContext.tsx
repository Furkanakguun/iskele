import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { MOCK_USERS, type Role } from '../mock/data'

export type SessionUser = {
  username: string
  displayName: string
  role: Role
}

type AuthContextValue = {
  user: SessionUser | null
  login: (username: string, password: string) => string | null
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'iskele.session'

function readStored(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readStored())

  const login = useCallback((username: string, password: string) => {
    const found = MOCK_USERS.find(
      (u) => u.username === username.trim() && u.password === password,
    )
    if (!found) return 'Invalid username or password.'
    const session: SessionUser = {
      username: found.username,
      displayName: found.displayName,
      role: found.role,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    return null
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
