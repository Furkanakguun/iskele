import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import {
  discoverRepo,
  useWorkspace,
  type AddRepoInput,
} from '../workspace/WorkspaceContext'
import type { Branch } from '../mock/data'

type Step = 'form' | 'review'
type SourceKind = 'workspace' | 'remote'

export function AddRepoPage() {
  const { user } = useAuth()
  const { addRepo } = useWorkspace()
  const navigate = useNavigate()

  const [sourceKind, setSourceKind] = useState<SourceKind>('workspace')
  const [projectKey, setProjectKey] = useState('LOCAL')
  const [slug, setSlug] = useState('')
  const [source, setSource] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<{
    name: string
    defaultBranch: string
    branches: Branch[]
  } | null>(null)
  const [defaultBranch, setDefaultBranch] = useState('development')

  const field =
    'mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime'

  const canAdd = Boolean(user)

  async function onDiscover(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await discoverRepo(
        user!.token,
        projectKey,
        slug,
        source.trim(),
      )
      setDiscovered({
        name: result.name,
        defaultBranch: result.defaultBranch,
        branches: result.branches,
      })
      setDefaultBranch(result.defaultBranch)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  async function onConfirm(e: FormEvent) {
    e.preventDefault()
    if (!discovered) return
    setLoading(true)
    const input: AddRepoInput = {
      projectKey,
      slug,
      name: discovered.name,
      defaultBranch,
      branches: discovered.branches,
      description: `Git ${projectKey.trim().toUpperCase()}/${slug.trim().toLowerCase()}`,
      cloneUrl: source.trim(),
    }
    const result = await addRepo(input)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/')
  }

  if (!canAdd) {
    return (
      <p className="text-muted">
        Sign in required to add a repo.{' '}
        <Link to="/repos" className="text-lime">
          Back
        </Link>
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/repos" className="text-[13px] text-muted hover:text-text">
        ← Repos
      </Link>
      <h2 className="mt-2 text-2xl font-semibold">Add repository</h2>
      <p className="mt-1 text-[13px] text-muted">
        Use a local git folder, or a Git clone URL. Iskele copies into its own
        volume.
      </p>

      <div className="mt-4 flex gap-2 font-mono text-[11px] text-muted">
        <span className={step === 'form' ? 'text-lime' : ''}>1. connect</span>
        <span>/</span>
        <span className={step === 'review' ? 'text-lime' : ''}>2. review</span>
        <span>/</span>
        <span>3. done</span>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {step === 'form' && (
        <form onSubmit={onDiscover} className="card mt-5 space-y-4 p-5">
          <fieldset>
            <legend className="text-[12px] text-muted">Source</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
                  sourceKind === 'workspace'
                    ? 'border-lime/50 bg-lime/10 text-text'
                    : 'border-border text-muted'
                }`}
              >
                <input
                  type="radio"
                  name="sourceKind"
                  className="mt-1 accent-[var(--color-lime)]"
                  checked={sourceKind === 'workspace'}
                  onChange={() => {
                    setSourceKind('workspace')
                    setSource('')
                  }}
                />
                <span>
                  <span className="block font-medium text-text">
                    Local git folder
                  </span>
                  <span className="text-[11px] text-muted">
                    Existing git folder on this machine
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
                  sourceKind === 'remote'
                    ? 'border-lime/50 bg-lime/10 text-text'
                    : 'border-border text-muted'
                }`}
              >
                <input
                  type="radio"
                  name="sourceKind"
                  className="mt-1 accent-[var(--color-lime)]"
                  checked={sourceKind === 'remote'}
                  onChange={() => {
                    setSourceKind('remote')
                    setSource('')
                    if (projectKey === 'LOCAL') setProjectKey('GIT')
                  }}
                />
                <span>
                  <span className="block font-medium text-text">
                    Git clone URL
                  </span>
                  <span className="text-[11px] text-muted">
                    HTTPS or SSH clone URL
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {sourceKind === 'workspace' ? (
            <label className="block text-[12px] text-muted">
              Workspace path
              <input
                className={`${field} font-mono text-[12px]`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="C:\work\my-repo"
                required
              />
            </label>
          ) : (
            <label className="block text-[12px] text-muted">
              Clone URL
              <input
                className={`${field} font-mono text-[12px]`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://git.example.com/org/repo.git"
                required
              />
              <span className="mt-1 block text-[11px]">
                Private servers: set API token under Settings first.
              </span>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[12px] text-muted">
              Project key
              <input
                className={`${field} font-mono uppercase`}
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
                placeholder={sourceKind === 'workspace' ? 'LOCAL' : 'PROJ'}
                required
              />
            </label>
            <label className="block text-[12px] text-muted">
              Repository slug
              <input
                className={`${field} font-mono`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-repo"
                required
              />
            </label>
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Discovering…' : 'Discover branches'}
          </Button>
        </form>
      )}

      {step === 'review' && discovered && (
        <form onSubmit={onConfirm} className="card mt-5 space-y-4 p-5">
          <div>
            <p className="text-[11px] uppercase text-muted">
              {sourceKind === 'workspace' ? 'Workspace' : 'Clone URL'}
            </p>
            <p className="mt-1 text-lg font-semibold">{discovered.name}</p>
            <p className="break-all font-mono text-[12px] text-muted">{source}</p>
            <p className="mt-1 font-mono text-[12px] text-muted">
              {projectKey.trim().toUpperCase()}/{slug.trim().toLowerCase()}
            </p>
          </div>

          <label className="block text-[12px] text-muted">
            Default branch
            <select
              className={field}
              value={defaultBranch}
              onChange={(e) => setDefaultBranch(e.target.value)}
            >
              {discovered.branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} · {b.dockerfileCount} Dockerfile · {b.shortSha}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-border bg-bg p-3">
            <p className="text-[11px] uppercase text-muted">Branches found</p>
            <ul className="mt-2 space-y-2">
              {discovered.branches.map((b) => (
                <li
                  key={b.name}
                  className="flex justify-between gap-2 text-[13px]"
                >
                  <span className="font-mono">{b.name}</span>
                  <span className="text-muted">
                    {b.dockerfileCount} df · {b.shortSha}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Add repository
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep('form')
                setDiscovered(null)
              }}
            >
              Back
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
