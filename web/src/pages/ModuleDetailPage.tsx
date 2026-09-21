import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import {
  modulesFor,
  REGISTRY,
  type ModuleAction,
} from '../mock/data'
import { useWorkspace } from '../workspace/WorkspaceContext'

const ACTIONS: {
  id: ModuleAction
  label: string
  hint: string
  needsImage?: boolean
}[] = [
  { id: 'build', label: 'Build image', hint: 'docker build' },
  { id: 'tar', label: 'Tar', hint: 'docker save | gzip', needsImage: true },
  { id: 'zip', label: 'Zip', hint: 'module package' },
]

/** …-catalog → catalog (image prefix strip for default grep) */
function defaultGrepFilter(imageName: string): string {
  return (
    imageName.replace(new RegExp(`^${REGISTRY.imagePrefix}`), '') || imageName
  )
}

export function ModuleDetailPage() {
  const { repoId = '', branch = '', moduleId = '' } = useParams()
  const branchName = decodeURIComponent(branch)
  const navigate = useNavigate()
  const { repos } = useWorkspace()
  const repo = repos.find((r) => r.id === repoId)
  const mod = modulesFor(repoId, branchName).find((m) => m.id === moduleId)
  const [remote, setRemote] = useState(REGISTRY.remoteUrl)
  const [imageName, setImageName] = useState(mod?.imageName ?? '')
  const [tag, setTag] = useState(
    () => mod?.lastImageTag?.split(':')[1] ?? REGISTRY.imageVersion,
  )
  const [editingImage, setEditingImage] = useState(false)
  const [editingTag, setEditingTag] = useState(false)

  const [grepFilter, setGrepFilter] = useState(() =>
    defaultGrepFilter(mod?.imageName ?? ''),
  )
  const [editingGrep, setEditingGrep] = useState(false)
  const [imagesOutput, setImagesOutput] = useState('')
  const [imagesLoading, setImagesLoading] = useState(false)

  const hasImage = Boolean(
    mod &&
      (mod.lastImageTag ||
        mod.status === 'ready' ||
        mod.status === 'pushed'),
  )
  const effectiveImage = (imageName.trim() || mod?.imageName || '').trim()

  const imagesCmd = useMemo(
    () =>
      grepFilter.trim()
        ? `docker images | grep "${grepFilter.trim()}"`
        : 'docker images',
    [grepFilter],
  )

  const refreshImages = useCallback(async () => {
    if (!mod) return
    setImagesLoading(true)
    await new Promise((r) => setTimeout(r, 450))
    const filter = grepFilter.trim().toLowerCase()
    const header =
      'REPOSITORY                                          TAG              IMAGE ID       CREATED        SIZE'
    const rows: string[] = []

    const matchSelf =
      !filter ||
      effectiveImage.toLowerCase().includes(filter) ||
      (mod.lastImageTag ?? '').toLowerCase().includes(filter)

    if (matchSelf && (hasImage || mod.lastImageTag)) {
      const repoCol = effectiveImage.padEnd(50).slice(0, 50)
      const tagCol = (tag || 'latest').padEnd(16).slice(0, 16)
      rows.push(`${repoCol} ${tagCol} a1b2c3d4e5f6   2 hours ago    412MB`)
    }

    if (
      !filter ||
      mod.baseImage.toLowerCase().includes(filter) ||
      filter.includes('temurin') ||
      filter.includes('alpine')
    ) {
      const baseName = mod.baseImage.split(':')[0] ?? 'eclipse-temurin'
      const baseTag = mod.baseImage.split(':')[1] ?? 'latest'
      rows.push(
        `${`${REGISTRY.remoteUrl}/${baseName}`.padEnd(50).slice(0, 50)} ${baseTag.padEnd(16).slice(0, 16)} 9f8e7d6c5b4a   3 weeks ago    198MB`,
      )
    }

    const body =
      rows.length > 0
        ? [header, ...rows].join('\n')
        : `${header}\n(no matching images — mock)`

    setImagesOutput(body)
    setImagesLoading(false)
  }, [effectiveImage, grepFilter, hasImage, mod, tag])

  useEffect(() => {
    void refreshImages()
  }, [mod?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!repo || !mod) {
    return <p className="text-danger">Module not found.</p>
  }

  const moduleIdSafe = mod.id
  const defaultImageName = mod.imageName

  function run(action: ModuleAction) {
    const q = new URLSearchParams({
      repoId,
      branch: branchName,
      moduleId: moduleIdSafe,
      action,
      remote,
      image: effectiveImage || defaultImageName,
      tag: tag.trim() || REGISTRY.imageVersion,
    })
    navigate(`/jobs/new?${q.toString()}`)
  }

  const inputCls =
    'w-full min-w-0 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-lime'

  function commitGrepEdit() {
    setEditingGrep(false)
    void refreshImages()
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <Link
              to={`/repos/${repoId}/branches/${encodeURIComponent(branchName)}`}
              className="hover:text-text"
            >
              ← Modules
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{mod.name}</h2>
              <p className="mt-1 font-mono text-[12px] text-muted">
                {mod.path}/{mod.dockerfile}
              </p>
            </div>
            <StatusBadge status={mod.status} />
          </div>

          <div className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted">
                    Image
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {editingImage ? (
                      <input
                        className={inputCls}
                        value={imageName}
                        onChange={(e) => setImageName(e.target.value)}
                        onBlur={() => setEditingImage(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingImage(false)
                        }}
                        autoFocus
                        spellCheck={false}
                      />
                    ) : (
                      <p className="min-w-0 flex-1 truncate font-mono text-[13px]">
                        {imageName || mod.imageName}
                      </p>
                    )}
                    <button
                      type="button"
                      title="Edit image name"
                      onClick={() => setEditingImage((v) => !v)}
                      className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-lime"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                </div>

                <span className="mb-1.5 px-1 font-mono text-lg text-muted">:</span>

                <div className="min-w-[8rem] flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted">
                    Tag
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {editingTag ? (
                      <input
                        className={inputCls}
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onBlur={() => setEditingTag(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingTag(false)
                        }}
                        autoFocus
                        spellCheck={false}
                      />
                    ) : (
                      <p className="min-w-0 flex-1 truncate font-mono text-[13px]">
                        {tag}
                      </p>
                    )}
                    <button
                      type="button"
                      title="Edit tag"
                      onClick={() => setEditingTag((v) => !v)}
                      className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-lime"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted">
                → {effectiveImage}:{tag.trim()}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">
                Base
              </p>
              <p className="mt-1 font-mono text-[13px]">{mod.baseImage}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">
                EXPOSE
              </p>
              <p className="mt-1 font-mono text-[13px]">{mod.expose}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                Last tag
              </p>
              <p className="mt-1 truncate font-mono text-[13px]">
                {mod.lastImageTag ?? '—'}
              </p>
            </div>
            {mod.note && (
              <div className="sm:col-span-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[13px] text-warn">
                {mod.note}
              </div>
            )}
          </div>

          <h3 className="mt-6 text-sm font-semibold">Actions</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ACTIONS.map((a) => {
              const disabled = a.needsImage && !hasImage && a.id !== 'build'
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => run(a.id)}
                  className={`card flex items-center justify-between gap-3 p-4 text-left transition hover:border-lime/40 disabled:cursor-not-allowed disabled:opacity-40 ${
                    a.id === 'build' ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-[12px] text-muted">{a.hint}</div>
                  </div>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">
                    {a.id}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold">Push target</h3>
            <label className="mt-3 block text-[12px] text-muted">
              Remote URL
              <input
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-lime"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-[12px] text-muted">
              Tag / version
              <input
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-lime"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              />
            </label>
            <Button
              variant="primary"
              className="mt-4 w-full"
              disabled={!hasImage}
              onClick={() => run('push')}
            >
              Push
            </Button>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold">Artifact</h3>
            <p className="mt-2 font-mono text-[12px] text-muted">
              {mod.lastArtifact ?? 'No tar/zip yet'}
            </p>
            {mod.lastJobId && (
              <Link
                to={`/jobs/${mod.lastJobId}`}
                className="mt-3 inline-block text-[13px] text-lime hover:underline"
              >
                Open last log
              </Link>
            )}
          </div>
        </aside>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Local docker images</h3>
          <button
            type="button"
            title="Refresh"
            disabled={imagesLoading}
            onClick={() => void refreshImages()}
            className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-lime disabled:opacity-40"
          >
            <RefreshIcon spinning={imagesLoading} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-bg px-3 py-2 font-mono text-[11px] text-muted">
            {editingGrep ? (
              <>
                <span className="shrink-0">$ docker images | grep "</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                  value={grepFilter}
                  onChange={(e) => setGrepFilter(e.target.value)}
                  onBlur={commitGrepEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitGrepEdit()
                  }}
                  autoFocus
                  spellCheck={false}
                  placeholder="catalog"
                />
                <span className="shrink-0">"</span>
              </>
            ) : (
              <p className="min-w-0 flex-1 truncate">$ {imagesCmd}</p>
            )}
            <button
              type="button"
              title="Edit grep filter"
              onClick={() => {
                if (editingGrep) commitGrepEdit()
                else setEditingGrep(true)
              }}
              className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-lime"
            >
              <PencilIcon />
            </button>
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg bg-bg p-3 font-mono text-[11px] leading-relaxed text-lime">
            {imagesOutput || (imagesLoading ? '…' : '')}
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
