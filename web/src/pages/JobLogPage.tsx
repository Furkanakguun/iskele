import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { api } from '../lib/api'
import { mapModule, type ApiModule } from '../lib/mappers'
import type { DockerModule, ModuleAction } from '../mock/data'

type JobOut = {
  id: string
  status: string
  action: string
  repo_id: string
  branch: string
  module_id: string
  archive_path?: string | null
  lines: string[]
  error: string | null
}

export function JobLogPage() {
  const { jobId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isNew = jobId === 'new' || jobId === 'yeni'
  const endRef = useRef<HTMLDivElement>(null)

  const action = (search.get('action') ?? 'build') as ModuleAction
  const repoId = search.get('repoId') ?? ''
  const branch = search.get('branch') ?? ''
  const moduleId = search.get('moduleId') ?? ''
  const remote = search.get('remote')
  const tag = search.get('tag')
  const image = search.get('image')
  const archive = search.get('archive') ?? ''

  const [mod, setMod] = useState<DockerModule | null>(null)
  const [job, setJob] = useState<JobOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isWorkshop =
    action === 'save' ||
    action === 'load' ||
    action.startsWith('prune-') ||
    Boolean(archive) ||
    Boolean(job?.archive_path) ||
    job?.module_id === 'archive' ||
    job?.module_id === 'catalog' ||
    (job?.action ?? '').startsWith('prune-')

  useEffect(() => {
    if (!user?.token || !repoId || !moduleId) return
    void (async () => {
      try {
        const row = await api<ApiModule>(
          `/api/repos/${repoId}/modules/${moduleId}?branch=${encodeURIComponent(branch)}`,
          { token: user.token },
        )
        setMod(mapModule(row))
      } catch {
        setMod(null)
      }
    })()
  }, [user?.token, repoId, branch, moduleId])

  useEffect(() => {
    if (!user?.token) return
    if (!isNew) return

    void (async () => {
      try {
        const created = await api<JobOut>('/api/jobs', {
          method: 'POST',
          token: user.token,
          body: JSON.stringify({
            repo_id: repoId || 'local',
            branch: branch || '-',
            module_id:
              moduleId ||
              (archive ||
              action === 'save' ||
              action === 'load' ||
              action.startsWith('prune-')
                ? 'catalog'
                : ''),
            action,
            image: image || undefined,
            tag: tag || undefined,
            remote: remote || undefined,
            archive_path: archive || undefined,
          }),
        })
        setJob(created)
        navigate(`/jobs/${created.id}`, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Job failed to start')
      }
    })()
  }, [
    user?.token,
    isNew,
    repoId,
    branch,
    moduleId,
    action,
    image,
    tag,
    remote,
    archive,
    navigate,
  ])

  useEffect(() => {
    if (!user?.token || isNew || !jobId) return
    let cancelled = false
    let timer: number | undefined

    async function tick() {
      try {
        const loaded = await api<JobOut>(`/api/jobs/${jobId}`, {
          token: user.token,
        })
        if (cancelled) return
        setJob(loaded)
        setError(null)
        if (loaded.status === 'queued' || loaded.status === 'running') {
          timer = window.setTimeout(() => {
            void tick()
          }, 700)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Job failed to load')
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [user?.token, isNew, jobId])

  const lines = job?.lines ?? []

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
            isWorkshop
              ? '/images'
              : `/repos/${repoId}/branches/${encodeURIComponent(branch)}/modules/${moduleId}`,
          )
        }
      >
        ← {isWorkshop ? 'Images' : (mod?.name ?? 'Module')}
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold capitalize">
            {job?.action ?? action}
          </h2>
          <p className="mt-1 break-all text-[13px] text-muted">
            {isWorkshop
              ? archive || job?.archive_path || image || 'docker'
              : `${mod?.path ?? moduleId} · ${branch}`}
          </p>
          {job?.error && (
            <p className="mt-2 text-[13px] text-danger">{job.error}</p>
          )}
        </div>
        <StatusBadge status={job?.status ?? 'queued'} />
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[11px] text-muted">
          <span>iskele job · {job?.id ?? '…'}</span>
          <span>{lines.length} lines</span>
        </div>
        <pre className="max-h-[28rem] overflow-auto bg-bg p-4 font-mono text-[12px] leading-relaxed text-lime">
          {lines.length === 0 && !error && (
            <span className="text-muted">waiting…</span>
          )}
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
              isWorkshop
                ? '/images'
                : `/repos/${repoId}/branches/${encodeURIComponent(branch)}/modules/${moduleId}`,
            )
          }
        >
          {isWorkshop ? 'Back to images' : 'Back to module'}
        </Button>
        {!isWorkshop && (
          <Link to={`/repos/${repoId}/branches/${encodeURIComponent(branch)}`}>
            <Button>Module list</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
