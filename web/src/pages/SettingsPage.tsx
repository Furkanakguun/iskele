import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { api } from '../lib/api'

type SettingsOut = {
  git_base_url: string
  git_token_set: boolean
  docker_host: string
  remote_registry: string
  image_version: string
  image_prefix: string
}

export function SettingsPage() {
  const { user } = useAuth()
  const [gitUrl, setGitUrl] = useState('')
  const [token, setToken] = useState('')
  const [tokenSet, setTokenSet] = useState(false)
  const [dockerHost, setDockerHost] = useState('localhost')
  const [remote, setRemote] = useState('')
  const [version, setVersion] = useState('')
  const [prefix, setPrefix] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin || !user?.token) return
    void (async () => {
      try {
        const data = await api<SettingsOut>('/api/settings', {
          token: user.token,
        })
        setGitUrl(data.git_base_url)
        setTokenSet(data.git_token_set)
        setDockerHost(data.docker_host)
        setRemote(data.remote_registry)
        setVersion(data.image_version)
        setPrefix(data.image_prefix)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [isAdmin, user?.token])

  const field =
    'mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime'

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!user?.token) return
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      const body: Record<string, string> = {
        git_base_url: gitUrl,
        docker_host: dockerHost,
        remote_registry: remote,
        image_version: version,
        image_prefix: prefix,
      }
      if (token.trim()) body.git_token = token.trim()
      const data = await api<SettingsOut>('/api/settings', {
        method: 'PUT',
        token: user.token,
        body: JSON.stringify(body),
      })
      setTokenSet(data.git_token_set)
      setToken('')
      setNotice('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p className="text-[13px] text-muted">
        Connection settings. Add or remove repos from the{' '}
        <Link to="/repos" className="text-lime hover:underline">
          Repos
        </Link>{' '}
        tab.
      </p>

      {notice && (
        <p className="rounded-xl bg-lime/15 px-3 py-2 text-[13px] text-lime">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <form onSubmit={save} className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold">Git server</h2>
          <label className="block text-[12px] text-muted">
            Base URL
            <input
              className={field}
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
            />
          </label>
          <label className="block text-[12px] text-muted">
            API token
            <input
              type="password"
              className={`${field} font-mono text-[12px]`}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={
                tokenSet ? '•••••••• (leave blank to keep)' : '••••••••'
              }
            />
          </label>
          <label className="block text-[12px] text-muted">
            Docker host
            <input
              className={`${field} font-mono text-[12px]`}
              value={dockerHost}
              onChange={(e) => setDockerHost(e.target.value)}
            />
          </label>
          <label className="block text-[12px] text-muted">
            Remote registry
            <input
              className={`${field} font-mono text-[12px]`}
              value={remote}
              onChange={(e) => setRemote(e.target.value)}
            />
          </label>
          <label className="block text-[12px] text-muted">
            Default image version
            <input
              className={`${field} font-mono text-[12px]`}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </label>
          <label className="block text-[12px] text-muted">
            Image name prefix
            <input
              className={`${field} font-mono text-[12px]`}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </label>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      )}
    </div>
  )
}
