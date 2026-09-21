import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { useWorkspace } from '../workspace/WorkspaceContext'

export function ReposPage() {
  const { user } = useAuth()
  const { repos, repo, getBranches, removeRepo, setRepoId } = useWorkspace()

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Repositories</h2>
          <p className="mt-1 text-[13px] text-muted">
            Add or remove repos here. Active repo is selected from the header
            dropdown.
          </p>
        </div>
        <Link to="/repos/new">
          <Button variant="primary">Add repo</Button>
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {repos.map((r) => {
          const branches = getBranches(r.id)
          const active = r.id === repo.id
          return (
            <div
              key={r.id}
              className={`card p-5 ${active ? 'border-lime/50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{r.name}</h3>
                    {active && (
                      <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-medium text-lime">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-muted">
                    {r.projectKey}/{r.slug}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
                  {branches.length} branch
                </span>
              </div>
              <p className="mt-3 text-[13px] text-muted">{r.description}</p>
              <p className="mt-3 text-[12px] text-muted">
                Default: <span className="text-text">{r.defaultBranch}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!active && (
                  <Button variant="secondary" onClick={() => setRepoId(r.id)}>
                    Set active
                  </Button>
                )}
                <Link to={`/repos/${r.id}`}>
                  <Button variant="ghost">Branches</Button>
                </Link>
                {user?.role === 'admin' && repos.length > 1 && (
                  <Button variant="danger" onClick={() => removeRepo(r.id)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
