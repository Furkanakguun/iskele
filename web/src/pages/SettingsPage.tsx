import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { REGISTRY } from '../mock/data'

export function SettingsPage() {
  const { user } = useAuth()
  const [bbUrl, setBbUrl] = useState('https://git.example.local')
  const [token, setToken] = useState('')
  const [remote, setRemote] = useState(REGISTRY.remoteUrl)
  const [version, setVersion] = useState(REGISTRY.imageVersion)
  const [notice, setNotice] = useState<string | null>(null)

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  const field =
    'mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime'

  function save(e: FormEvent) {
    e.preventDefault()
    setNotice('Settings saved (mock).')
    setToken('')
  }

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

      <form onSubmit={save} className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold">Git server</h2>
        <label className="block text-[12px] text-muted">
          Base URL
          <input
            className={field}
            value={bbUrl}
            onChange={(e) => setBbUrl(e.target.value)}
          />
        </label>
        <label className="block text-[12px] text-muted">
          API token
          <input
            type="password"
            className={`${field} font-mono text-[12px]`}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="••••••••"
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
        <Button type="submit" variant="primary">
          Save
        </Button>
      </form>
    </div>
  )
}
