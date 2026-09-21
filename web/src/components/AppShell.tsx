import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'
import { IskeleLogo } from './IskeleLogo'

const items = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/repos', label: 'Repos', icon: '▣' },
  { to: '/activity', label: 'Activity', icon: '☰' },
  { to: '/users', label: 'Users', icon: '☺', admin: true },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { repo, repos, setRepoId } = useWorkspace()
  const loc = useLocation()

  const title = loc.pathname.startsWith('/repos')
    ? 'Repos'
    : loc.pathname.startsWith('/activity')
      ? 'Activity'
      : loc.pathname.startsWith('/users')
        ? 'Users'
        : loc.pathname.startsWith('/settings')
          ? 'Settings'
          : loc.pathname.startsWith('/jobs')
            ? 'Job'
            : 'Dashboard'

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-[72px] flex-col items-center border-r border-border bg-surface py-4">
        <div className="mb-6">
          <IskeleLogo size={40} />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-2">
          {items
            .filter((i) => !i.admin || user?.role === 'admin')
            .map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                title={i.label}
                className={({ isActive }) =>
                  [
                    'flex h-10 w-10 items-center justify-center rounded-full text-lg transition',
                    isActive
                      ? 'bg-lime text-bg'
                      : 'text-muted hover:bg-surface-2 hover:text-text',
                  ].join(' ')
                }
              >
                {i.icon}
              </NavLink>
            ))}
        </nav>
        <button
          type="button"
          onClick={logout}
          title="Logout"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted hover:text-text"
        >
          {user?.displayName?.charAt(0) ?? '?'}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">
              {greeting()}, {user?.displayName}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
              {repos.length > 0 && (
                <>
                  <span className="text-muted/50">/</span>
                  <select
                    value={repo.id}
                    onChange={(e) => setRepoId(e.target.value)}
                    className="max-w-[280px] truncate rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[12px] text-muted outline-none hover:text-text focus:border-lime focus:text-text"
                    title="Active repo"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.projectKey}/{r.slug}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[11px] text-muted sm:flex">
            <span className="rounded border border-border px-2 py-1">
              {repos.length > 0
                ? `${repo.projectKey}/${repo.slug}`
                : 'No repo'}
            </span>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
