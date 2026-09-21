import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'

export type AppConfig = {
  git_base_url: string
  git_token_set: boolean
  docker_host: string
  remote_registry: string
  image_version: string
  image_prefix: string
  data_dir: string
}

const DEFAULTS: AppConfig = {
  git_base_url: 'https://git.example.local',
  git_token_set: false,
  docker_host: 'localhost',
  remote_registry: 'registry.example.com/nimbus',
  image_version: '2.3.1',
  image_prefix: 'nimbus-',
  data_dir: '',
}

type AppConfigContextValue = {
  config: AppConfig
  loading: boolean
  refresh: () => Promise<void>
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [config, setConfig] = useState<AppConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user?.token) {
      setConfig(DEFAULTS)
      setLoading(false)
      return
    }
    try {
      const data = await api<AppConfig>('/api/settings', { token: user.token })
      setConfig(data)
    } catch {
      setConfig(DEFAULTS)
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ config, loading, refresh }),
    [config, loading, refresh],
  )

  return (
    <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig requires AppConfigProvider')
  return ctx
}
