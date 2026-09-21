import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { api } from '../lib/api'

type UserRow = {
  id: number
  username: string
  display_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<Role>('tester')

  const field =
    'mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-lime'

  const load = useCallback(async () => {
    if (!user?.token) return
    try {
      const rows = await api<UserRow[]>('/api/users', { token: user.token })
      setUsers(rows)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    }
  }, [user?.token])

  useEffect(() => {
    void load()
  }, [load])

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!user?.token) return
    setBusy(true)
    setError(null)
    try {
      await api<UserRow>('/api/users', {
        method: 'POST',
        token: user.token,
        body: JSON.stringify({
          username,
          password,
          display_name: displayName || username,
          role,
        }),
      })
      setUsername('')
      setPassword('')
      setDisplayName('')
      setRole('tester')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: number) {
    if (!user?.token) return
    if (!window.confirm('Delete this user?')) return
    setBusy(true)
    setError(null)
    try {
      await api<void>(`/api/users/${id}`, {
        method: 'DELETE',
        token: user.token,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="mt-1 text-[13px] text-muted">
          Only admins can create accounts. No public signup.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      <form onSubmit={onCreate} className="card space-y-3 p-5">
        <h3 className="text-sm font-semibold">Add user</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[12px] text-muted">
            Username
            <input
              className={field}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="block text-[12px] text-muted">
            Password
            <input
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
          </label>
          <label className="block text-[12px] text-muted">
            Display name
            <input
              className={field}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="block text-[12px] text-muted">
            Role
            <select
              className={field}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="tester">tester</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Create user'}
        </Button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.display_name}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {u.username}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="danger"
                    disabled={busy || u.username === user.username}
                    onClick={() => void onDelete(u.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
