import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { modulesFor } from '../mock/data'
import { useWorkspace } from '../workspace/WorkspaceContext'

export function ModulesPage() {
  const { repoId = '', branch = '' } = useParams()
  const branchName = decodeURIComponent(branch)
  const { repos } = useWorkspace()
  const repo = repos.find((r) => r.id === repoId)
  const modules = modulesFor(repoId, branchName)

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

      {modules.length === 0 ? (
        <div className="card mt-5 p-6 text-[13px] text-muted">
          No Dockerfile scan for this branch yet (mock). Nimbus Cart{' '}
          <code className="text-text">development</code> ships with 10 modules.
          Newly added repos will scan automatically once the API is connected.
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
                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                  {m.path}/{m.dockerfile} · EXPOSE {m.expose}
                </p>
                {m.note && (
                  <p className="mt-1 text-[11px] text-warn">{m.note}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/repos/${repoId}/branches/${encodeURIComponent(branchName)}/modules/${m.id}`}
                >
                  <Button variant="primary">Open</Button>
                </Link>
                <Link
                  to={`/jobs/new?repoId=${repoId}&branch=${encodeURIComponent(branchName)}&moduleId=${m.id}&action=build`}
                >
                  <Button>Build</Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
