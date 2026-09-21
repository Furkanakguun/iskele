import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import {
  mapBranch,
  mapRepo,
  type ApiBranch,
  type ApiRepo,
} from '../lib/mappers'
import type { Branch, Repo } from '../mock/data'

export type AddRepoInput = {
  projectKey: string
  slug: string
  name?: string
  defaultBranch: string
  description?: string
  branches?: Branch[]
}

type WorkspaceContextValue = {
  repos: Repo[]
  repo: Repo
  branch: string
  branchMeta: Branch | undefined
  branches: Branch[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setRepoId: (id: string) => void
  setBranch: (name: string) => void
  addRepo: (
    input: AddRepoInput,
  ) => Promise<{ ok: true; repo: Repo } | { ok: false; error: string }>
  removeRepo: (id: string) => Promise<void>
  getBranches: (repoId: string) => Branch[]
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const WS_KEY = 'iskele.workspace.v3'

type WsStored = { repoId: string; branch: string }

function readWs(): WsStored | null {
  try {
    const raw = localStorage.getItem(WS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WsStored
  } catch {
    return null
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [repos, setRepos] = useState<Repo[]>([])
  const [branchesMap, setBranchesMap] = useState<Record<string, Branch[]>>({})
  const [repoId, setRepoIdState] = useState('')
  const [branch, setBranchState] = useState('development')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persistWs = useCallback((nextRepoId: string, nextBranch: string) => {
    localStorage.setItem(
      WS_KEY,
      JSON.stringify({ repoId: nextRepoId, branch: nextBranch }),
    )
  }, [])

  const loadBranches = useCallback(
    async (id: string, token: string) => {
      const rows = await api<ApiBranch[]>(`/api/repos/${id}/branches`, { token })
      const mapped = rows.map(mapBranch)
      setBranchesMap((prev) => ({ ...prev, [id]: mapped }))
      return mapped
    },
    [],
  )

  const refresh = useCallback(async () => {
    if (!user?.token) {
      setRepos([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await api<ApiRepo[]>('/api/repos', { token: user.token })
      const mapped = rows.map(mapRepo)
      setRepos(mapped)

      const stored = readWs()
      const active =
        mapped.find((r) => r.id === (stored?.repoId || repoId)) ?? mapped[0]
      if (!active) {
        setRepoIdState('')
        setError(null)
        setLoading(false)
        return
      }

      setRepoIdState(active.id)
      const blist = await loadBranches(active.id, user.token)
      const nextBranch =
        stored?.branch && blist.some((b) => b.name === stored.branch)
          ? stored.branch
          : active.defaultBranch
      setBranchState(nextBranch)
      persistWs(active.id, nextBranch)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repos')
    } finally {
      setLoading(false)
    }
  }, [loadBranches, persistWs, repoId, user?.token])

  useEffect(() => {
    void refresh()
  }, [user?.token]) // eslint-disable-line react-hooks/exhaustive-deps

  const repo = repos.find((r) => r.id === repoId) ?? repos[0]
  const branches = repo ? branchesMap[repo.id] ?? [] : []
  const safeBranch = branches.some((b) => b.name === branch)
    ? branch
    : repo?.defaultBranch ?? branch
  const branchMeta = branches.find((b) => b.name === safeBranch)

  const setRepoId = useCallback(
    async (id: string) => {
      const next = repos.find((r) => r.id === id) ?? repos[0]
      if (!next || !user?.token) return
      setRepoIdState(next.id)
      let blist = branchesMap[next.id]
      if (!blist) {
        blist = await loadBranches(next.id, user.token)
      }
      const nextBranch = next.defaultBranch
      setBranchState(nextBranch)
      persistWs(next.id, nextBranch)
      if (!blist.some((b) => b.name === nextBranch) && user.token) {
        await loadBranches(next.id, user.token)
      }
    },
    [branchesMap, loadBranches, persistWs, repos, user?.token],
  )

  const setBranch = useCallback(
    (name: string) => {
      setBranchState(name)
      if (repoId) persistWs(repoId, name)
    },
    [persistWs, repoId],
  )

  const getBranches = useCallback(
    (id: string) => branchesMap[id] ?? [],
    [branchesMap],
  )

  const addRepo = useCallback(
    async (input: AddRepoInput) => {
      if (!user?.token) return { ok: false as const, error: 'Not signed in' }
      try {
        const created = await api<ApiRepo>('/api/repos', {
          method: 'POST',
          token: user.token,
          body: JSON.stringify({
            project_key: input.projectKey,
            slug: input.slug,
            name: input.name ?? '',
            default_branch: input.defaultBranch,
            description: input.description ?? '',
            branches: (input.branches ?? []).map((b) => ({
              name: b.name,
              short_sha: b.shortSha,
              commit_message: b.commitMessage,
              updated_at: b.updatedAt,
              dockerfile_count: b.dockerfileCount,
            })),
          }),
        })
        const mapped = mapRepo(created)
        await refresh()
        setRepoIdState(mapped.id)
        setBranchState(mapped.defaultBranch)
        persistWs(mapped.id, mapped.defaultBranch)
        return { ok: true as const, repo: mapped }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : 'Add repo failed',
        }
      }
    },
    [persistWs, refresh, user?.token],
  )

  const removeRepo = useCallback(
    async (id: string) => {
      if (!user?.token) return
      await api<void>(`/api/repos/${id}`, {
        method: 'DELETE',
        token: user.token,
      })
      await refresh()
    },
    [refresh, user?.token],
  )

  const value = useMemo(() => {
    const fallbackRepo: Repo = repo ?? {
      id: '',
      projectKey: '—',
      slug: '—',
      name: 'No repo',
      description: '',
      defaultBranch: 'main',
    }
    return {
      repos,
      repo: fallbackRepo,
      branch: safeBranch,
      branchMeta,
      branches,
      loading,
      error,
      refresh,
      setRepoId: (id: string) => {
        void setRepoId(id)
      },
      setBranch,
      addRepo,
      removeRepo: (id: string) => {
        void removeRepo(id)
      },
      getBranches,
    }
  }, [
    addRepo,
    branchMeta,
    branches,
    error,
    getBranches,
    loading,
    refresh,
    removeRepo,
    repo,
    repos,
    safeBranch,
    setBranch,
    setRepoId,
  ])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace requires WorkspaceProvider')
  return ctx
}

export async function discoverRepo(
  token: string,
  projectKey: string,
  slug: string,
) {
  const data = await api<{
    project_key: string
    slug: string
    name: string
    default_branch: string
    branches: ApiBranch[]
  }>(
    `/api/repos/discover?project_key=${encodeURIComponent(projectKey)}&slug=${encodeURIComponent(slug)}`,
    { token },
  )
  return {
    projectKey: data.project_key,
    slug: data.slug,
    name: data.name,
    defaultBranch: data.default_branch,
    branches: data.branches.map(mapBranch),
  }
}
