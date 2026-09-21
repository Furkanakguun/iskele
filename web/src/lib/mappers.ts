import type { Branch, DockerModule, Repo } from '../mock/data'

export type ApiRepo = {
  id: string
  project_key: string
  slug: string
  name: string
  description: string
  default_branch: string
}

export type ApiBranch = {
  name: string
  short_sha: string
  commit_message: string
  updated_at: string
  dockerfile_count: number
}

export type ApiModule = {
  id: string
  name: string
  path: string
  dockerfile: string
  base_image: string
  expose: string
  image_name: string
  status: string
  last_image_tag: string | null
  last_artifact: string | null
  last_job_id: string | null
  note?: string | null
}

export function mapRepo(r: ApiRepo): Repo {
  return {
    id: r.id,
    projectKey: r.project_key,
    slug: r.slug,
    name: r.name,
    description: r.description,
    defaultBranch: r.default_branch,
  }
}

export function mapBranch(b: ApiBranch): Branch {
  return {
    name: b.name,
    shortSha: b.short_sha,
    commitMessage: b.commit_message,
    updatedAt: b.updated_at,
    dockerfileCount: b.dockerfile_count,
  }
}

export function mapModule(m: ApiModule): DockerModule {
  return {
    id: m.id,
    name: m.name,
    path: m.path,
    dockerfile: m.dockerfile,
    baseImage: m.base_image,
    expose: m.expose,
    imageName: m.image_name,
    status: m.status as DockerModule['status'],
    lastImageTag: m.last_image_tag,
    lastArtifact: m.last_artifact,
    lastJobId: m.last_job_id,
    note: m.note ?? undefined,
  }
}
