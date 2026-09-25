import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'
import { Button } from './Button'

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

export function DiskUsagePanel() {
  const { user } = useAuth()
  const [storage, setStorage] = useState<StorageOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    try {
      const data = await api<StorageOut>('/api/settings/storage', {
        token: user.token,
      })
      setStorage(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage')
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    void load()
  }, [load])

  const diskPct =
    storage && storage.disk_total_bytes > 0
      ? Math.min(
          100,
          Math.round((storage.disk_used_bytes / storage.disk_total_bytes) * 100),
        )
      : 0

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Disk usage</h2>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {storage && (
        <>
          <p className="break-all font-mono text-[11px] text-muted">
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
            {storage.images.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">No images.</p>
            ) : (
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
            )}
          </div>
        </>
      )}
    </section>
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
