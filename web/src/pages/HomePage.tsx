import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { ACTIVITIES, modulesFor, RUNNING, runningUrl } from '../mock/data'
import { useWorkspace } from '../workspace/WorkspaceContext'

const selectCls =
  'w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none focus:border-lime'

export function HomePage() {
  const { repo, branch, branchMeta, branches, setBranch } = useWorkspace()

  const modules = modulesFor(repo.id, branch)
  const ready = modules.filter(
    (m) => m.status === 'ready' || m.status === 'pushed',
  ).length
  const building = modules.filter((m) => m.status === 'building').length
  const failed = modules.filter((m) => m.status === 'failed').length

  const [psFilter, setPsFilter] = useState('')
  const [editingPs, setEditingPs] = useState(false)
  const [psOutput, setPsOutput] = useState('')
  const [psLoading, setPsLoading] = useState(false)

  const psCmd = useMemo(
    () =>
      psFilter.trim()
        ? `docker ps | grep "${psFilter.trim()}"`
        : 'docker ps',
    [psFilter],
  )

  const refreshPs = useCallback(async () => {
    setPsLoading(true)
    await new Promise((r) => setTimeout(r, 450))
    const filter = psFilter.trim().toLowerCase()
    const header =
      'CONTAINER ID   IMAGE                                          COMMAND                  CREATED        STATUS        PORTS                     NAMES'
    const allRows = RUNNING.map((c, i) => {
      const id = `${'abcdef0123456789'.slice(i, i + 12)}`
      const image = c.image.padEnd(46).slice(0, 46)
      const ports = `0.0.0.0:${c.hostPort}->${c.containerPort}/tcp`.padEnd(25)
      return `${id}   ${image} "java -jar app.jar"      ${c.upFor.padEnd(12)} Up ${c.upFor.padEnd(9)} ${ports} ${c.name}`
    })
    const rows = filter
      ? allRows.filter((r) => r.toLowerCase().includes(filter))
      : allRows
    const body =
      rows.length > 0
        ? [header, ...rows].join('\n')
        : `${header}\n(no matching containers — mock)`
    setPsOutput(body)
    setPsLoading(false)
  }, [psFilter])

  useEffect(() => {
    void refreshPs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function commitPsEdit() {
    setEditingPs(false)
    void refreshPs()
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {/* Branch only — repo switch is in header / Repos tab */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                branch
              </span>
              <span className="font-mono text-[11px] text-lime">
                {modules.length} Dockerfile
              </span>
            </div>
            <div className="p-4">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Select branch
              </label>
              <select
                className={`${selectCls} mt-1.5`}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} ({b.shortSha}) · {b.dockerfileCount} df
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded bg-bg px-2 py-1 font-mono text-[11px] text-muted">
                  HEAD {branchMeta?.shortSha}
                </span>
                <span className="text-[12px] text-muted">
                  {branchMeta?.commitMessage}
                </span>
              </div>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Dockerfiles', value: modules.length },
              { label: 'Ready', value: ready },
              { label: 'Building', value: building },
              { label: 'Failed', value: failed },
            ].map((m) => (
              <div key={m.label} className="card spark p-4">
                <p className="text-[12px] text-muted">{m.label}</p>
                <p className="mt-1 text-2xl font-semibold">{m.value}</p>
              </div>
            ))}
          </div>

          <section className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Modules · {branch}</h2>
              <span className="font-mono text-[11px] text-muted">
                {repo.projectKey}/{repo.slug}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-2.5 font-medium">Module</th>
                    <th className="px-4 py-2.5 font-medium">EXPOSE</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Image</th>
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-border/70 last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="font-mono text-[11px] text-muted">
                          {m.path}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted">
                        {m.expose}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[11px] text-muted">
                        {m.lastImageTag ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/repos/${repo.id}/branches/${encodeURIComponent(branch)}/modules/${m.id}`}
                          className="text-[12px] font-medium text-lime hover:underline"
                        >
                          open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="font-mono text-[11px] uppercase text-muted">
              pipeline
            </p>
            <ol className="mt-3 space-y-2 font-mono text-[12px] text-muted">
              <li className="text-lime">#1 branch</li>
              <li>#2 open module</li>
              <li>#3 build → tar → zip → push</li>
              <li className="text-muted">repo add/remove → Repos tab</li>
            </ol>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Activity</h3>
            <ul className="mt-3 space-y-3">
              {ACTIVITIES.slice(0, 5).map((a) => (
                <li key={a.id} className="text-[13px]">
                  <p>{a.text}</p>
                  <p className="text-[11px] text-muted">{a.timeAgo}</p>
                </li>
              ))}
            </ul>
            <Link
              to="/activity"
              className="mt-3 inline-block text-[12px] text-lime hover:underline"
            >
              view all
            </Link>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Running</h3>
              <span className="font-mono text-[11px] text-muted">
                {RUNNING.length} up
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {RUNNING.map((c) => {
                const url = runningUrl(c)
                return (
                  <li key={c.id} className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{c.name}</p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate font-mono text-[11px] text-lime hover:underline"
                      title={url}
                    >
                      {url}
                    </a>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      :{c.hostPort} · Up {c.upFor}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Local docker ps</h3>
          <button
            type="button"
            title="Refresh"
            disabled={psLoading}
            onClick={() => void refreshPs()}
            className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-lime disabled:opacity-40"
          >
            <RefreshIcon spinning={psLoading} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-bg px-3 py-2 font-mono text-[11px] text-muted">
            {editingPs ? (
              <>
                <span className="shrink-0">$ docker ps | grep "</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                  value={psFilter}
                  onChange={(e) => setPsFilter(e.target.value)}
                  onBlur={commitPsEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitPsEdit()
                  }}
                  autoFocus
                  spellCheck={false}
                  placeholder="catalog"
                />
                <span className="shrink-0">"</span>
              </>
            ) : (
              <p className="min-w-0 flex-1 truncate">$ {psCmd}</p>
            )}
            <button
              type="button"
              title="Edit grep filter"
              onClick={() => {
                if (editingPs) commitPsEdit()
                else setEditingPs(true)
              }}
              className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-lime"
            >
              <PencilIcon />
            </button>
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg bg-bg p-3 font-mono text-[11px] leading-relaxed text-lime">
            {psOutput || (psLoading ? '…' : '')}
          </pre>
        </div>
      </div>
    </div>
  )
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={spinning ? 'animate-spin' : undefined}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}
