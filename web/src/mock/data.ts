export type Role = 'admin' | 'user'

export type ModuleAction =
  | 'build'
  | 'tar'
  | 'zip'
  | 'load'
  | 'push'
  | 'save'
  | 'prune-dangling'
  | 'prune-builder'
  | 'prune-containers'

export type JobStatus = 'queued' | 'running' | 'success' | 'failed'

export type ModuleStatus = 'idle' | 'building' | 'ready' | 'failed' | 'pushed'

export type Repo = {
  id: string
  projectKey: string
  slug: string
  name: string
  description: string
  defaultBranch: string
  createdByUsername?: string
}

export type Branch = {
  name: string
  shortSha: string
  commitMessage: string
  updatedAt: string
  dockerfileCount: number
}

export type DockerModule = {
  id: string
  name: string
  path: string
  dockerfile: string
  baseImage: string
  expose: string
  imageName: string
  status: ModuleStatus
  lastImageTag: string | null
  lastArtifact: string | null
  lastJobId: string | null
  note?: string
}

export type ActivityItem = {
  id: string
  text: string
  timeAgo: string
  tone: 'ok' | 'warn' | 'info' | 'fail'
}

export function statusLabel(s: string): string {
  switch (s) {
    case 'idle':
      return 'Idle'
    case 'building':
    case 'running':
      return 'Running'
    case 'ready':
      return 'Ready'
    case 'failed':
      return 'Failed'
    case 'pushed':
    case 'success':
      return 'Done'
    case 'queued':
      return 'Queued'
    default:
      return s
  }
}
