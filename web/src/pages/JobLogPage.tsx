import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import {
  ACTION_LOGS,
  modulesFor,
  type JobStatus,
  type ModuleAction,
} from '../mock/data'

export function JobLogPage() {
  const { jobId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const isNew = jobId === 'new' || jobId === 'yeni'
  const endRef = useRef<HTMLDivElement>(null)

  const action = (search.get('action') ?? 'build') as ModuleAction
  const repoId = search.get('repoId') ?? 'repo-nimbus-cart'
  const branch = search.get('branch') ?? 'development'
  const moduleId = search.get('moduleId') ?? 'mod-cart'
  const mod = modulesFor(repoId, branch).find((m) => m.id === moduleId)
  const remote = search.get('remote')
  const tag = search.get('tag')

  const baseLines = ACTION_LOGS[action] ?? ACTION_LOGS.build
  const seed = [
    `[iskele] module=${mod?.name ?? moduleId}`,
    `[iskele] branch=${branch}`,
    `[iskele] action=${action}`,
    remote ? `[iskele] remote=${remote}` : null,
    tag ? `[iskele] tag=${tag}` : null,
  ].filter(Boolean) as string[]

  const [status, setStatus] = useState<JobStatus>(isNew ? 'running' : 'success')
  const [lines, setLines] = useState<string[]>(
    isNew ? [] : [...seed, ...baseLines],
  )

  useEffect(() => {
    if (!isNew) return
    const full = [...seed, ...baseLines]
    let i = 0
    const timer = window.setInterval(() => {
      if (i >= full.length) {
        window.clearInterval(timer)
        const failStorefront = moduleId === 'mod-storefront' && action === 'build'
        setStatus(failStorefront ? 'failed' : 'success')
        if (failStorefront) {
          setLines((prev) => [
            ...prev,
            '[iskele] ERROR: dist/ not found — build the storefront first',
          ])
        }
        return
      }
      setLines((prev) => [...prev, full[i]])
      i += 1
    }, 260)
    return () => window.clearInterval(timer)
  }, [isNew, moduleId, action]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div>
      <button
        type="button"
        className="text-[13px] text-muted hover:text-text"
        onClick={() =>
          navigate(
            `/repos/${repoId}/branches/${encodeURIComponent(branch)}/modules/${moduleId}`,
          )
        }
      >
        ← {mod?.name ?? 'Module'}
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold capitalize">{action}</h2>
          <p className="mt-1 text-[13px] text-muted">
            {mod?.path} · {branch}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[11px] text-muted">
          <span>iskele job · mock</span>
          <span>{lines.length} lines</span>
        </div>
        <pre className="max-h-[28rem] overflow-auto bg-bg p-4 font-mono text-[12px] leading-relaxed text-lime">
          {lines.length === 0 && <span className="text-muted">waiting…</span>}
          {lines.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`}>{line}</div>
          ))}
          <div ref={endRef} />
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() =>
            navigate(
              `/repos/${repoId}/branches/${encodeURIComponent(branch)}/modules/${moduleId}`,
            )
          }
        >
          Back to module
        </Button>
        <Link to={`/repos/${repoId}/branches/${encodeURIComponent(branch)}`}>
          <Button>Module list</Button>
        </Link>
      </div>
    </div>
  )
}
