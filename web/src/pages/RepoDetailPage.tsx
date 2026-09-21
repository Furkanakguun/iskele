import { Link, useParams } from 'react-router-dom'
import { useWorkspace } from '../workspace/WorkspaceContext'

export function RepoDetailPage() {
  const { repoId } = useParams()
  const { repos, getBranches } = useWorkspace()
  const repo = repos.find((r) => r.id === repoId)
  const branches = repoId ? getBranches(repoId) : []

  if (!repo) {
    return (
      <p className="text-danger">
        Repo not found.{' '}
        <Link to="/repos" className="underline">
          Back
        </Link>
      </p>
    )
  }

  return (
    <div>
      <Link to="/repos" className="text-[13px] text-muted hover:text-text">
        ← Repos
      </Link>
      <h2 className="mt-2 text-2xl font-semibold">{repo.name}</h2>
      <p className="mt-1 font-mono text-[12px] text-muted">
        {repo.projectKey}/{repo.slug}
      </p>
      <p className="mt-4 text-[13px] text-muted">
        Select a branch. Dockerfiles will be scanned into a module list.
      </p>

      <div className="card mt-5 overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Commit
              </th>
              <th className="px-4 py-3 font-medium">Dockerfile</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr
                key={b.name}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {b.shortSha}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">
                  {b.commitMessage}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-lime/15 px-2.5 py-1 text-[11px] font-medium text-lime">
                    {b.dockerfileCount} files
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/repos/${repo.id}/branches/${encodeURIComponent(b.name)}`}
                    className="inline-flex rounded-full bg-lime px-3 py-1.5 text-[12px] font-semibold text-bg"
                  >
                    Select
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
