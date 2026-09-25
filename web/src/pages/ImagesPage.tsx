import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { api } from '../lib/api'
import { formatBytes } from '../lib/format'

type ImageRow = {
  repository: string
  tag: string
  id: string
  size_bytes: number
  ref: string
}

type SettingsOut = {
  data_dir: string
}

function safeFile(ref: string) {
  return ref.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'image'
}

export function ImagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [images, setImages] = useState<ImageRow[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dataDir, setDataDir] = useState('')
  const [archivePath, setArchivePath] = useState('')
  const [exportRef, setExportRef] = useState('')
  const [exportPath, setExportPath] = useState('')
  const [busyRef, setBusyRef] = useState<string | null>(null)

  const field =
    'mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm outline-none focus:border-lime'

  const loadImages = useCallback(async () => {
    if (!user?.token) return
    setLoading(true)
    try {
      const rows = await api<ImageRow[]>('/api/docker/catalog', {
        token: user.token,
      })
      setImages(rows)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list images')
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => {
    void loadImages()
  }, [loadImages])

  useEffect(() => {
    if (!user?.token) return
    void (async () => {
      try {
        const data = await api<SettingsOut>('/api/settings', { token: user.token })
        setDataDir(data.data_dir)
      } catch {
        setDataDir('')
      }
    })()
  }, [user?.token])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return images
    return images.filter((img) => img.ref.toLowerCase().includes(q) || img.id.toLowerCase().includes(q))
  }, [filter, images])

  function startLoad(e: FormEvent) {
    e.preventDefault()
    const path = archivePath.trim()
    if (!path) return
    navigate(`/jobs/new?action=load&archive=${encodeURIComponent(path)}`)
  }

  function startExport(e: FormEvent) {
    e.preventDefault()
    const ref = exportRef.trim()
    if (!ref) return
    const fallback = dataDir
      ? `${dataDir.replace(/[\\/]+$/, '')}\\artifacts\\${safeFile(ref)}.tar.gz`
      : `${safeFile(ref)}.tar.gz`
    const dest = exportPath.trim() || fallback
    const q = new URLSearchParams({
      action: 'save',
      image: ref,
      archive: dest,
    })
    navigate(`/jobs/new?${q.toString()}`)
  }

  function startPrune(
    action: 'prune-dangling' | 'prune-builder' | 'prune-containers',
    confirmText: string,
  ) {
    if (!window.confirm(confirmText)) return
    navigate(`/jobs/new?action=${action}`)
  }

  function pickExport(ref: string) {
    setExportRef(ref)
    if (dataDir) {
      setExportPath(
        `${dataDir.replace(/[\\/]+$/, '')}\\artifacts\\${safeFile(ref)}.tar.gz`,
      )
    }
  }

  async function removeImage(ref: string) {
    if (!user?.token) return
    if (!window.confirm(`Remove ${ref} from Docker?`)) return
    setBusyRef(ref)
    setNotice(null)
    try {
      const res = await api<{ ok: boolean; output: string }>('/api/docker/rmi', {
        method: 'POST',
        token: user.token,
        body: JSON.stringify({ ref }),
      })
      if (!res.ok) {
        setError(res.output || `Failed to remove ${ref}`)
      } else {
        setError(null)
        setNotice(`Removed ${ref}`)
        await loadImages()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setBusyRef(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-[13px] text-muted">
        Local Docker images. Load a <code className="text-text">docker save</code>{' '}
        archive, export an image, or clean one type of leftover at a time.
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

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={startLoad} className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Load archive</h2>
          <p className="text-[13px] text-muted">
            <code className="text-text">.tar</code> /{' '}
            <code className="text-text">.tar.gz</code> →{' '}
            <code className="text-text">docker load</code>
          </p>
          <label className="block text-[12px] text-muted">
            Archive path
            <input
              className={field}
              value={archivePath}
              onChange={(e) => setArchivePath(e.target.value)}
              placeholder="D:\images\app.tar.gz"
              required
            />
          </label>
          <Button type="submit" variant="primary" disabled={!archivePath.trim()}>
            Load into Docker
          </Button>
        </form>

        <form onSubmit={startExport} className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Export image</h2>
          <p className="text-[13px] text-muted">
            <code className="text-text">docker save</code> + gzip to a local path
          </p>
          <label className="block text-[12px] text-muted">
            Image
            <input
              className={field}
              value={exportRef}
              onChange={(e) => setExportRef(e.target.value)}
              placeholder="repo/name:tag"
              required
            />
          </label>
          <label className="block text-[12px] text-muted">
            Output path
            <input
              className={field}
              value={exportPath}
              onChange={(e) => setExportPath(e.target.value)}
              placeholder={
                dataDir
                  ? `${dataDir}\\artifacts\\image.tar.gz`
                  : 'D:\\images\\out.tar.gz'
              }
            />
          </label>
          <Button type="submit" variant="primary" disabled={!exportRef.trim()}>
            Save tar.gz
          </Button>
        </form>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Clean up</h2>
          <p className="mt-1 text-[13px] text-muted">
            Running all three in any order is a full leftover cleanup. Tagged
            images stay — including unused base images — unless you press{' '}
            <span className="text-text">Remove</span> on a row below.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card flex flex-col space-y-3 p-5">
            <h3 className="text-sm font-semibold">Dangling images</h3>
            <p className="flex-1 text-[13px] text-muted">
              Only nameless leftovers listed as{' '}
              <code className="text-text">&lt;none&gt;</code>. Failed or replaced
              builds leave these. A pulled{' '}
              <code className="text-text">name:tag</code> image is never this.
            </p>
            <p className="font-mono text-[11px] text-muted">docker image prune -f</p>
            <Button
              type="button"
              variant="ghostDanger"
              onClick={() =>
                startPrune(
                  'prune-dangling',
                  'Remove only <none> dangling images? Tagged images (including unused base images) stay.',
                )
              }
            >
              Prune dangling
            </Button>
          </div>
          <div className="card flex flex-col space-y-3 p-5">
            <h3 className="text-sm font-semibold">Build cache</h3>
            <p className="flex-1 text-[13px] text-muted">
              Only BuildKit layer cache on disk. Not an image in the list below.
              Next build may download layers again.
            </p>
            <p className="font-mono text-[11px] text-muted">docker builder prune -f</p>
            <Button
              type="button"
              variant="ghostDanger"
              onClick={() =>
                startPrune(
                  'prune-builder',
                  'Remove unused build cache only? No tagged images are deleted. The next build may take longer.',
                )
              }
            >
              Prune cache
            </Button>
          </div>
          <div className="card flex flex-col space-y-3 p-5">
            <h3 className="text-sm font-semibold">Stopped containers</h3>
            <p className="flex-1 text-[13px] text-muted">
              Only containers that already exited. Does not delete any image —
              not even unused ones.
            </p>
            <p className="font-mono text-[11px] text-muted">
              docker container prune -f
            </p>
            <Button
              type="button"
              variant="ghostDanger"
              onClick={() =>
                startPrune(
                  'prune-containers',
                  'Remove stopped containers only? No images are deleted. Running containers stay.',
                )
              }
            >
              Prune stopped
            </Button>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">On this machine</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-48 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-lime"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => void loadImages()}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">
            {loading ? 'Loading…' : 'No local images.'}
          </p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Image</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((img) => (
                <tr key={`${img.ref}:${img.id}`} className="border-b border-border/70 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-mono text-[12px]">{img.ref}</div>
                    <div className="font-mono text-[11px] text-muted">{img.id}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-muted">
                    {formatBytes(img.size_bytes)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        disabled={busyRef === img.ref}
                        onClick={() => pickExport(img.ref)}
                      >
                        Export
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busyRef === img.ref}
                        onClick={() => void removeImage(img.ref)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
