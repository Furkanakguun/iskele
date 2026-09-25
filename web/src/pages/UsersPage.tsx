import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, type Role } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { api } from '../lib/api'

type UserRow = {
  id: number
  username: string
  role: Role
  is_active: boolean
  created_at: string
}

function roleLabel(role: Role) {
  return role === 'admin' ? 'Admin' : 'User'
}

export function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [isActive, setIsActive] = useState(true)

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

  function resetForm() {
    setUsername('')
    setPassword('')
    setRole('user')
    setIsActive(true)
    setEditingId(null)
    setMode('idle')
  }

  function startCreate() {
    setUsername('')
    setPassword('')
    setRole('user')
    setIsActive(true)
    setEditingId(null)
    setMode('create')
    setError(null)
  }

  function startEdit(row: UserRow) {
    setEditingId(row.id)
    setUsername(row.username)
    setPassword('')
    setRole(row.role)
    setIsActive(row.is_active)
    setMode('edit')
    setError(null)
  }

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.token) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'create') {
        await api<UserRow>('/api/users', {
          method: 'POST',
          token: user.token,
          body: JSON.stringify({
            username,
            password,
            role,
          }),
        })
      } else if (mode === 'edit' && editingId != null) {
        const body: Record<string, unknown> = {
          role,
          is_active: isActive,
        }
        if (password.trim()) body.password = password.trim()
        await api<UserRow>(`/api/users/${editingId}`, {
          method: 'PATCH',
          token: user.token,
          body: JSON.stringify(body),
        })
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
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
      if (editingId === id) resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const editing = mode !== 'idle'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="mt-1 text-[13px] text-muted">
            Two types: <span className="text-text">Admin</span> (full access) and{' '}
            <span className="text-text">User</span> (build / checkout). Admins
            add, edit, and remove accounts.
          </p>
        </div>
        <Button variant="primary" onClick={startCreate}>
          Add user
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <h3 className="text-sm font-semibold">
            {mode === 'create' ? 'New user' : `Edit ${username}`}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] text-muted">
              Username
              <input
                className={field}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                disabled={mode === 'edit'}
              />
            </label>
            <label className="block text-[12px] text-muted">
              Password
              {mode === 'edit' ? ' (leave blank to keep)' : ''}
              <input
                type="password"
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === 'create'}
                minLength={mode === 'create' ? 4 : undefined}
              />
            </label>
            <label className="block text-[12px] text-muted">
              Type
              <select
                className={field}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-[var(--color-lime)]"
              />
              Active (can sign in)
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 font-mono text-[13px]">{u.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] ${
                      u.role === 'admin'
                        ? 'bg-lime/15 text-lime'
                        : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-muted">
                  {u.is_active ? 'Active' : 'Disabled'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => startEdit(u)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy || u.id === users.find((x) => x.username === user.username)?.id}
                      onClick={() => void onDelete(u.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
