import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { api } from '../lib/api'
import { mapModule, type ApiModule } from '../lib/mappers'
import type { DockerModule } from '../mock/data'
import { useWorkspace } from '../workspace/WorkspaceContext'

export function ModulesPage() {
  const { repoId = '', branch = '' } = useParams()
  const branchName = decodeURIComponent(branch)
  const { repos } = useWorkspace()
  const { user } = useAuth()
  const repo = repos.find((r) => r.id === repoId)
  const [modules, setModules] = useState<DockerModule[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.token || !repoId) return
    void (async () => {
      try {
        const rows = await api<ApiModule[]>(
          `/api/repos/${repoId}/modules?branch=${encodeURIComponent(branchName)}`,
          { token: user.token },
        )
        setModules(rows.map(mapModule))
        setError(null)
      } catch (err) {
        setModules([])
        setError(err instanceof Error ? err.message : 'Failed to load modules')
      }
    })()
  }, [user?.token, repoId, branchName])

  if (!repo) {
    return <p className="text-danger">Repo not found.</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <Link to="/repos" className="hover:text-text">
          Repos
        </Link>
        <span>/</span>
        <Link to={`/repos/${repoId}`} className="hover:text-text">
          {repo.name}
        </Link>
        <span>/</span>
        <span className="text-text">{branchName}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Dockerfile modules</h2>
          <p className="mt-1 text-[13px] text-muted">
            {modules.length} module · Build / Tar / Zip / Push
          </p>
        </div>
        <Link to={`/repos/${repoId}`}>
          <Button variant="ghost">Change branch</Button>
        </Link>
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      {modules.length === 0 ? (
        <div className="card mt-5 p-6 text-[13px] text-muted">
          No Dockerfile modules for this branch yet.
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {modules.map((m) => (
            <li
              key={m.id}
              className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/repos/${repoId}/branches/${encodeURIComponent(branchName)}/modules/${m.id}`}
                    className="font-semibold hover:text-lime"
                  >
                    {m.name}
                  </Link>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {m.path}/{m.dockerfile}
                </p>
              </div>
              <Link
                to={`/repos/${repoId}/branches/${encodeURIComponent(branchName)}/modules/${m.id}`}
                className="text-[12px] font-medium text-lime hover:underline"
              >
                open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
