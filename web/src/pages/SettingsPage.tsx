import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAppConfig } from '../auth/AppConfigContext'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

type SettingsOut = {
  git_base_url: string
  git_token_set: boolean
  docker_host: string
  remote_registry: string
  image_version: string
  image_prefix: string
  data_dir: string
}

type CheckoutUsage = {
  repo_id: string
  repo_label: string
  branch: string
  path: string
  size_bytes: number
}

type ImageUsage = {
  repository: string
  tag: string
  id: string
  size_bytes: number
}

type StorageOut = {
  data_dir: string
  iskele_bytes: number
  repos_bytes: number
  artifacts_bytes: number
  database_bytes: number
  checkouts: CheckoutUsage[]
  checkouts_demo: boolean
  checkouts_total_bytes: number
  images: ImageUsage[]
  images_demo: boolean
  images_total_bytes: number
  disk_total_bytes: number
  disk_used_bytes: number
  disk_free_bytes: number
}

export function SettingsPage() {
  const { user } = useAuth()
  const { refresh: refreshConfig } = useAppConfig()
  const [gitUrl, setGitUrl] = useState('')
  const [token, setToken] = useState('')
  const [tokenSet, setTokenSet] = useState(false)
  const [dockerHost, setDockerHost] = useState('localhost')
  const [remote, setRemote] = useState('')
  const [version, setVersion] = useState('')
  const [prefix, setPrefix] = useState('')
  const [dataDir, setDataDir] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [storage, setStorage] = useState<StorageOut | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [storageLoading, setStorageLoading] = useState(true)

  const isAdmin = user?.role === 'admin'

  const loadStorage = useCallback(async () => {
    if (!user?.token) return
    setStorageLoading(true)
    try {
      const data = await api<StorageOut>('/api/settings/storage', {
        token: user.token,
      })
      setStorage(data)
      setStorageError(null)
    } catch (err) {
      setStorageError(
        err instanceof Error ? err.message : 'Failed to load storage',
      )
    } finally {
      setStorageLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    if (!user?.token) return
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
        setDataDir(data.data_dir)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.token])

  useEffect(() => {
    void loadStorage()
  }, [loadStorage])

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
        data_dir: dataDir,
      }
      if (token.trim()) body.git_token = token.trim()
      const data = await api<SettingsOut>('/api/settings', {
        method: 'PUT',
        token: user.token,
        body: JSON.stringify(body),
      })
      setTokenSet(data.git_token_set)
      setDataDir(data.data_dir)
      setToken('')
      setNotice('Settings saved.')
      await refreshConfig()
      await loadStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return <Navigate to="/login" replace />

  const diskPct =
    storage && storage.disk_total_bytes > 0
      ? Math.min(
          100,
          Math.round((storage.disk_used_bytes / storage.disk_total_bytes) * 100),
        )
      : 0

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-[13px] text-muted">
        Connection settings and disk usage on the Iskele volume. Add or remove
        repos from the{' '}
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

      {/* Storage */}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Disk usage</h2>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void loadStorage()}
            disabled={storageLoading}
          >
            {storageLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {storageError && (
          <p className="text-[13px] text-danger">{storageError}</p>
        )}

        {storage && (
          <>
            <p className="font-mono text-[11px] text-muted break-all">
              volume · {storage.data_dir}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Stat
                label="Iskele volume"
                value={formatBytes(storage.iskele_bytes)}
                hint="repos + artifacts + db on disk"
              />
              <Stat
                label="Checkouts"
                value={formatBytes(storage.checkouts_total_bytes)}
                hint={
                  storage.checkouts_demo
                    ? 'demo estimate (no real checkout yet)'
                    : `${storage.checkouts.length} branch folder(s)`
                }
              />
              <Stat
                label="Docker images"
                value={formatBytes(storage.images_total_bytes)}
                hint={
                  storage.images_demo
                    ? 'demo sizes (docker CLI unavailable)'
                    : `${storage.images.length} image(s)`
                }
              />
              <Stat
                label="Disk free"
                value={formatBytes(storage.disk_free_bytes)}
                hint={`${formatBytes(storage.disk_used_bytes)} / ${formatBytes(storage.disk_total_bytes)} used`}
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] text-muted">
                <span>Host disk</span>
                <span>{diskPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-lime/80"
                  style={{ width: `${diskPct}%` }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                Checkout branches
              </h3>
              {storage.checkouts.length === 0 ? (
                <p className="mt-2 text-[13px] text-muted">No checkouts yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {storage.checkouts.map((c) => (
                    <li
                      key={`${c.repo_id}:${c.branch}:${c.path}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-[13px]"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[12px]">
                          {c.repo_label} · {c.branch}
                        </p>
                        <p className="truncate text-[11px] text-muted">{c.path}</p>
                      </div>
                      <span className="font-mono text-[12px] text-muted">
                        {formatBytes(c.size_bytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                Docker images
              </h3>
              <ul className="mt-2 max-h-48 divide-y divide-border overflow-auto rounded-xl border border-border">
                {storage.images.map((img) => (
                  <li
                    key={`${img.repository}:${img.tag}:${img.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-[13px]"
                  >
                    <p className="min-w-0 font-mono text-[12px]">
                      {img.repository}:{img.tag}
                    </p>
                    <span className="font-mono text-[12px] text-muted">
                      {formatBytes(img.size_bytes)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      {isAdmin && loading && <p className="text-muted">Loading…</p>}

      {isAdmin && !loading && (
        <form onSubmit={save} className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold">Connection</h2>
          <label className="block text-[12px] text-muted">
            Data volume path
            <input
              className={`${field} font-mono text-[12px]`}
              value={dataDir}
              onChange={(e) => setDataDir(e.target.value)}
            />
            <span className="mt-1 block text-[11px]">
              Checkouts live under{' '}
              <code className="text-text">…/repos/&lt;repo&gt;/&lt;branch&gt;</code>
              . Use a dedicated host volume on Jenkins.
            </span>
          </label>
          <label className="block text-[12px] text-muted">
            Git base URL
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

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg text-text">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </div>
  )
}
