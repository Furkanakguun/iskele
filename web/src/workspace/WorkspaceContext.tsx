import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  BRANCHES as SEED_BRANCHES,
  REPOS as SEED_REPOS,
  type Branch,
  type Repo,
} from '../mock/data'

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
  setRepoId: (id: string) => void
  setBranch: (name: string) => void
  addRepo: (input: AddRepoInput) => { ok: true; repo: Repo } | { ok: false; error: string }
  removeRepo: (id: string) => void
  getBranches: (repoId: string) => Branch[]
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const WS_KEY = 'iskele.workspace.v2'
const REPOS_KEY = 'iskele.repos.v2'
const BRANCHES_KEY = 'iskele.branches.v2'

type WsStored = { repoId: string; branch: string }

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function repoIdFrom(projectKey: string, slug: string) {
  return `repo-${projectKey.toLowerCase()}-${slug.toLowerCase()}`.replace(
    /[^a-z0-9-]/g,
    '-',
  )
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repo[]>(
    () => readJson<Repo[]>(REPOS_KEY) ?? [...SEED_REPOS],
  )
  const [branchesMap, setBranchesMap] = useState<Record<string, Branch[]>>(
    () => readJson<Record<string, Branch[]>>(BRANCHES_KEY) ?? { ...SEED_BRANCHES },
  )

  const stored = readJson<WsStored>(WS_KEY)
  const initialRepo =
    repos.find((r) => r.id === stored?.repoId) ?? repos[0] ?? SEED_REPOS[0]

  const [repoId, setRepoIdState] = useState(initialRepo?.id ?? '')
  const [branch, setBranchState] = useState(() => {
    const list = branchesMap[initialRepo?.id ?? ''] ?? []
    if (stored?.branch && list.some((b) => b.name === stored.branch)) {
      return stored.branch
    }
    return initialRepo?.defaultBranch ?? 'main'
  })

  const repo = repos.find((r) => r.id === repoId) ?? repos[0]
  const branches = repo ? branchesMap[repo.id] ?? [] : []
  const safeBranch = branches.some((b) => b.name === branch)
    ? branch
    : repo?.defaultBranch ?? branch
  const branchMeta = branches.find((b) => b.name === safeBranch)

  const persistWs = useCallback((nextRepoId: string, nextBranch: string) => {
    localStorage.setItem(
      WS_KEY,
      JSON.stringify({ repoId: nextRepoId, branch: nextBranch }),
    )
  }, [])

  const persistRepos = useCallback((next: Repo[]) => {
    localStorage.setItem(REPOS_KEY, JSON.stringify(next))
  }, [])

  const persistBranches = useCallback((next: Record<string, Branch[]>) => {
    localStorage.setItem(BRANCHES_KEY, JSON.stringify(next))
  }, [])

  const setRepoId = useCallback(
    (id: string) => {
      const next = repos.find((r) => r.id === id) ?? repos[0]
      if (!next) return
      setRepoIdState(next.id)
      setBranchState(next.defaultBranch)
      persistWs(next.id, next.defaultBranch)
    },
    [persistWs, repos],
  )

  const setBranch = useCallback(
    (name: string) => {
      setBranchState(name)
      persistWs(repoId, name)
    },
    [persistWs, repoId],
  )

  const getBranches = useCallback(
    (id: string) => branchesMap[id] ?? [],
    [branchesMap],
  )

  const addRepo = useCallback(
    (input: AddRepoInput) => {
      const projectKey = input.projectKey.trim().toUpperCase()
      const slug = input.slug.trim().toLowerCase()
      if (!projectKey || !slug) {
        return { ok: false as const, error: 'Project key and slug are required.' }
      }
      const id = repoIdFrom(projectKey, slug)
      if (repos.some((r) => r.id === id || (r.projectKey === projectKey && r.slug === slug))) {
        return { ok: false as const, error: 'This repo is already added.' }
      }

      const defaultBranch = input.defaultBranch.trim() || 'main'
      const discovered =
        input.branches && input.branches.length > 0
          ? input.branches
          : [
              {
                name: defaultBranch,
                shortSha: 'pending',
                commitMessage: 'Not scanned yet (mock)',
                updatedAt: new Date().toISOString(),
                dockerfileCount: 0,
              },
            ]

      const nextRepo: Repo = {
        id,
        projectKey,
        slug,
        name: input.name?.trim() || slug,
        description:
          input.description?.trim() ||
          `Git ${projectKey}/${slug} — added (mock)`,
        defaultBranch,
      }

      const nextRepos = [...repos, nextRepo]
      const nextBranches = { ...branchesMap, [id]: discovered }
      setRepos(nextRepos)
      setBranchesMap(nextBranches)
      persistRepos(nextRepos)
      persistBranches(nextBranches)
      setRepoIdState(id)
      setBranchState(defaultBranch)
      persistWs(id, defaultBranch)

      return { ok: true as const, repo: nextRepo }
    },
    [branchesMap, persistBranches, persistRepos, persistWs, repos],
  )

  const removeRepo = useCallback(
    (id: string) => {
      if (repos.length <= 1) return
      const nextRepos = repos.filter((r) => r.id !== id)
      const nextBranches = { ...branchesMap }
      delete nextBranches[id]
      setRepos(nextRepos)
      setBranchesMap(nextBranches)
      persistRepos(nextRepos)
      persistBranches(nextBranches)
      if (repoId === id) {
        const fallback = nextRepos[0]
        setRepoIdState(fallback.id)
        setBranchState(fallback.defaultBranch)
        persistWs(fallback.id, fallback.defaultBranch)
      }
    },
    [branchesMap, persistBranches, persistRepos, persistWs, repoId, repos],
  )

  const value = useMemo(() => {
    if (!repo) {
      return {
        repos,
        repo: SEED_REPOS[0],
        branch: 'development',
        branchMeta: undefined,
        branches: [],
        setRepoId,
        setBranch,
        addRepo,
        removeRepo,
        getBranches,
      }
    }
    return {
      repos,
      repo,
      branch: safeBranch,
      branchMeta,
      branches,
      setRepoId,
      setBranch,
      addRepo,
      removeRepo,
      getBranches,
    }
  }, [
    addRepo,
    branchMeta,
    branches,
    getBranches,
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

/** Mock Git server discover — replaced when real API lands */
export async function mockDiscoverRepo(projectKey: string, slug: string) {
  await new Promise((r) => setTimeout(r, 900))
  const key = projectKey.trim().toUpperCase()
  const s = slug.trim().toLowerCase()
  if (!key || !s) throw new Error('Project key / slug cannot be empty.')
  if (s.includes(' ')) throw new Error('Slug cannot contain spaces.')

  // simulate not found
  if (s === 'not-found') {
    throw new Error('Git server: repo not found (mock).')
  }

  const branches: Branch[] = [
    {
      name: 'main',
      shortSha: 'e1a2b3c',
      commitMessage: 'Initial import',
      updatedAt: new Date().toISOString(),
      dockerfileCount: 2,
    },
    {
      name: 'develop',
      shortSha: 'f4d5e6a',
      commitMessage: 'CI dockerfiles',
      updatedAt: new Date().toISOString(),
      dockerfileCount: 3,
    },
    {
      name: 'development',
      shortSha: 'a9b8c7d',
      commitMessage: 'Latest work',
      updatedAt: new Date().toISOString(),
      dockerfileCount: 4,
    },
  ]

  return {
    projectKey: key,
    slug: s,
    name: s
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    defaultBranch: 'development',
    branches,
  }
}
