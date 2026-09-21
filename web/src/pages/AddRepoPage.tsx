import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import {
  mockDiscoverRepo,
  useWorkspace,
  type AddRepoInput,
} from '../workspace/WorkspaceContext'
import type { Branch } from '../mock/data'

type Step = 'form' | 'review'

export function AddRepoPage() {
  const { user } = useAuth()
  const { addRepo } = useWorkspace()
  const navigate = useNavigate()

  const [projectKey, setProjectKey] = useState('NIMBUS')
  const [slug, setSlug] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<{
    name: string
    defaultBranch: string
    branches: Branch[]
  } | null>(null)
  const [defaultBranch, setDefaultBranch] = useState('development')
  const [setActive, setSetActive] = useState(true)

  const field =
    'mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime'

  const canAdd = user?.role === 'admin' || user?.role === 'tester'

  async function onDiscover(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await mockDiscoverRepo(projectKey, slug)
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

  function onConfirm(e: FormEvent) {
    e.preventDefault()
    if (!discovered) return
    const input: AddRepoInput = {
      projectKey,
      slug,
      name: discovered.name,
      defaultBranch,
      branches: discovered.branches,
      description: `Git ${projectKey.trim().toUpperCase()}/${slug.trim().toLowerCase()}`,
    }
    const result = addRepo(input)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (!setActive) {
      // addRepo already sets active; if user unchecked, we still leave it —
      // fine for MVP; they can switch in header
    }
    navigate(`/repos/${result.repo.id}`)
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
        Connect with a Git server project key + slug. Branches come from
        mock discovery; real list when the API is wired.
      </p>

      {/* steps */}
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
          <label className="block text-[12px] text-muted">
            Git server base URL
            <input
              className={`${field} text-muted`}
              value="https://git.example.local"
              disabled
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[12px] text-muted">
              Project key
              <input
                className={`${field} font-mono uppercase`}
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
                placeholder="NIMBUS"
                required
              />
            </label>
            <label className="block text-[12px] text-muted">
              Repository slug
              <input
                className={`${field} font-mono`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="nimbus-cart"
                required
              />
            </label>
          </div>
          <p className="text-[11px] text-muted">
            Tip: use slug <code className="text-text">not-found</code> to see
            the mock error.
          </p>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Discovering…' : 'Discover from Git server'}
          </Button>
        </form>
      )}

      {step === 'review' && discovered && (
        <form onSubmit={onConfirm} className="card mt-5 space-y-4 p-5">
          <div>
            <p className="text-[11px] uppercase text-muted">Discovered</p>
            <p className="mt-1 text-lg font-semibold">{discovered.name}</p>
            <p className="font-mono text-[12px] text-muted">
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

          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
              className="accent-[var(--color-lime)]"
            />
            Set as active repo after add
          </label>

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
