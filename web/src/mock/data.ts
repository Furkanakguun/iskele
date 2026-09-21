export type Role = 'admin' | 'tester'

export type ModuleAction = 'build' | 'tar' | 'zip' | 'load' | 'push'

export type JobStatus = 'queued' | 'running' | 'success' | 'failed'

export type ModuleStatus = 'idle' | 'building' | 'ready' | 'failed' | 'pushed'

export type Repo = {
  id: string
  projectKey: string
  slug: string
  name: string
  description: string
  defaultBranch: string
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

export const MOCK_USERS = [
  {
    username: 'testci',
    password: 'testci',
    role: 'tester' as Role,
    displayName: 'Alex Tester',
  },
  {
    username: 'admin',
    password: 'admin',
    role: 'admin' as Role,
    displayName: 'Admin',
  },
]

/** Demo repo — fictional e-commerce microservices (Nimbus Cart) */
export const REPOS: Repo[] = [
  {
    id: 'repo-nimbus-cart',
    projectKey: 'NIMBUS',
    slug: 'nimbus-cart',
    name: 'Nimbus Cart',
    description:
      'Checkout platform: catalog, cart, payment, identity + storefront. Pick a branch → operate on Dockerfile modules.',
    defaultBranch: 'development',
  },
]

export const BRANCHES: Record<string, Branch[]> = {
  'repo-nimbus-cart': [
    {
      name: 'development',
      shortSha: 'e7c41a9',
      commitMessage: 'Inventory stock sync retry',
      updatedAt: '2026-09-21T09:15:00+03:00',
      dockerfileCount: 10,
    },
    {
      name: 'release/2.3.1',
      shortSha: '91bf02d',
      commitMessage: 'Release 2.3.1 tags',
      updatedAt: '2026-09-12T14:02:00+03:00',
      dockerfileCount: 10,
    },
    {
      name: 'feature/promo-codes',
      shortSha: 'c4d88e1',
      commitMessage: 'Promo code validation API',
      updatedAt: '2026-09-10T11:40:00+03:00',
      dockerfileCount: 9,
    },
  ],
}

const DEV_MODULES: DockerModule[] = [
  {
    id: 'mod-catalog',
    name: 'Catalog',
    path: 'services/catalog',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8080',
    imageName: 'nimbus-catalog',
    status: 'ready',
    lastImageTag: 'nimbus-catalog:2.3.1-e7c41a9',
    lastArtifact: 'catalog-2.3.1-e7c41a9.tar.gz',
    lastJobId: 'job-201',
  },
  {
    id: 'mod-cart',
    name: 'Cart',
    path: 'services/cart',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8081',
    imageName: 'nimbus-cart',
    status: 'ready',
    lastImageTag: 'nimbus-cart:2.3.1-e7c41a9',
    lastArtifact: 'cart-2.3.1-e7c41a9.tar.gz',
    lastJobId: 'job-202',
  },
  {
    id: 'mod-checkout',
    name: 'Checkout',
    path: 'services/checkout',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8082',
    imageName: 'nimbus-checkout',
    status: 'building',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: 'job-203',
  },
  {
    id: 'mod-payment',
    name: 'Payment',
    path: 'services/payment',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8083',
    imageName: 'nimbus-payment',
    status: 'idle',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: null,
    note: 'PCI sandbox credentials required',
  },
  {
    id: 'mod-inventory',
    name: 'Inventory',
    path: 'services/inventory',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8084',
    imageName: 'nimbus-inventory',
    status: 'idle',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: null,
  },
  {
    id: 'mod-notify',
    name: 'Notification',
    path: 'services/notification',
    dockerfile: 'Dockerfile',
    baseImage: 'node:20-alpine',
    expose: '8090',
    imageName: 'nimbus-notification',
    status: 'idle',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: null,
  },
  {
    id: 'mod-identity',
    name: 'Identity',
    path: 'services/identity',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8085',
    imageName: 'nimbus-identity',
    status: 'pushed',
    lastImageTag: 'nimbus-identity:2.3.1-e7c41a9',
    lastArtifact: 'identity-2.3.1-e7c41a9.tar.gz',
    lastJobId: 'job-204',
  },
  {
    id: 'mod-search',
    name: 'Search',
    path: 'services/search',
    dockerfile: 'Dockerfile',
    baseImage: 'eclipse-temurin:17-jre-alpine',
    expose: '8086',
    imageName: 'nimbus-search',
    status: 'idle',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: null,
  },
  {
    id: 'mod-gateway',
    name: 'API Gateway',
    path: 'services/gateway',
    dockerfile: 'Dockerfile',
    baseImage: 'nginx:1.27-alpine',
    expose: '8088',
    imageName: 'nimbus-gateway',
    status: 'idle',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: null,
    note: 'Edge reverse proxy',
  },
  {
    id: 'mod-storefront',
    name: 'Storefront',
    path: 'apps/storefront',
    dockerfile: 'Dockerfile',
    baseImage: 'nginx:1.27-alpine',
    expose: '443',
    imageName: 'nimbus-storefront',
    status: 'failed',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: 'job-205',
    note: 'Requires dist/ before build',
  },
]

export const MODULES_BY_BRANCH: Record<string, DockerModule[]> = {
  'repo-nimbus-cart:development': DEV_MODULES,
  'repo-nimbus-cart:release/2.3.1': DEV_MODULES.map((m) => ({
    ...m,
    status: 'ready',
    lastImageTag: `${m.imageName}:2.3.1-91bf02d`,
    lastArtifact: `${m.id}-2.3.1-91bf02d.tar.gz`,
  })),
  'repo-nimbus-cart:feature/promo-codes': DEV_MODULES.filter(
    (m) => m.id !== 'mod-gateway',
  ).map((m) => ({
    ...m,
    status: 'idle',
    lastImageTag: null,
    lastArtifact: null,
    lastJobId: null,
  })),
}

export const REGISTRY = {
  remoteUrl: 'registry.example.com/nimbus',
  imageVersion: '2.3.1',
  imagePrefix: 'nimbus-',
}

/** Jenkins / docker host — used when building URLs */
export const DOCKER_HOST = 'localhost'

export type RunningContainer = {
  id: string
  name: string
  image: string
  hostPort: number
  containerPort: number
  upFor: string
}

/** Running (Up) containers — parsed from docker ps in production */
export const RUNNING: RunningContainer[] = [
  {
    id: 'c-catalog',
    name: 'nimbus-catalog',
    image: 'nimbus-catalog:2.3.1',
    hostPort: 31080,
    containerPort: 8080,
    upFor: '2 hours',
  },
  {
    id: 'c-cart',
    name: 'nimbus-cart',
    image: 'nimbus-cart:2.3.1',
    hostPort: 31081,
    containerPort: 8081,
    upFor: '3 hours',
  },
  {
    id: 'c-identity',
    name: 'nimbus-identity',
    image: 'nimbus-identity:2.3.1',
    hostPort: 31085,
    containerPort: 8085,
    upFor: '1 day',
  },
  {
    id: 'c-storefront',
    name: 'nimbus-storefront',
    image: 'nimbus-storefront:2.3.1',
    hostPort: 31443,
    containerPort: 443,
    upFor: '5 hours',
  },
]

export function runningUrl(c: RunningContainer): string {
  const scheme = c.containerPort === 443 || c.containerPort === 8443 ? 'https' : 'http'
  return `${scheme}://${DOCKER_HOST}:${c.hostPort}`
}

export const ACTIVITIES: ActivityItem[] = [
  {
    id: 'a1',
    text: 'Identity push → registry.example.com/nimbus',
    timeAgo: '12m ago',
    tone: 'ok',
  },
  {
    id: 'a2',
    text: 'Checkout build started (development)',
    timeAgo: '18m ago',
    tone: 'info',
  },
  {
    id: 'a3',
    text: 'Storefront build failed — dist/ not found',
    timeAgo: '1h ago',
    tone: 'fail',
  },
  {
    id: 'a4',
    text: 'Cart tar.gz created (142 MB)',
    timeAgo: '2h ago',
    tone: 'ok',
  },
  {
    id: 'a5',
    text: 'Catalog image loaded',
    timeAgo: '3h ago',
    tone: 'info',
  },
]

export const ACTION_LOGS: Record<ModuleAction, string[]> = {
  build: [
    '[iskele] git checkout development @ e7c41a9',
    '[iskele] context: services/cart',
    '[iskele] docker build -f Dockerfile -t nimbus-cart:2.3.1-e7c41a9 .',
    'Step 1/6 : FROM eclipse-temurin:17-jre-alpine',
    'Step 2/6 : COPY target/app.jar /app/app.jar',
    'Step 3/6 : COPY entrypoint.sh /app/',
    'Step 4/6 : WORKDIR /app',
    'Step 5/6 : EXPOSE 8081',
    'Step 6/6 : ENTRYPOINT ["./entrypoint.sh"]',
    'Successfully tagged nimbus-cart:2.3.1-e7c41a9',
    '[iskele] Build OK',
  ],
  tar: [
    '[iskele] docker save nimbus-cart:2.3.1-e7c41a9 | gzip',
    '[iskele] → /data/artifacts/cart-2.3.1-e7c41a9.tar.gz',
    '[iskele] size=142 MB',
    '[iskele] Tar OK',
  ],
  zip: [
    '[iskele] packing module context + Dockerfile',
    '[iskele] → /data/artifacts/cart-2.3.1-e7c41a9.zip',
    '[iskele] Zip OK',
  ],
  load: [
    '[iskele] docker load -i cart-2.3.1-e7c41a9.tar.gz',
    'Loaded image: nimbus-cart:2.3.1-e7c41a9',
    '[iskele] Load OK',
  ],
  push: [
    '[iskele] remote: registry.example.com/nimbus',
    '[iskele] docker tag + push',
    'The push refers to repository [registry.example.com/nimbus/nimbus-cart]',
    'digest: sha256:9f2c…',
    '[iskele] Push OK',
  ],
}

export function modulesFor(repoId: string, branch: string): DockerModule[] {
  return MODULES_BY_BRANCH[`${repoId}:${branch}`] ?? []
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    idle: 'Idle',
    building: 'Building',
    ready: 'Ready',
    failed: 'Failed',
    pushed: 'Pushed',
    queued: 'Queued',
    running: 'Running',
    success: 'Success',
  }
  return map[s] ?? s
}
