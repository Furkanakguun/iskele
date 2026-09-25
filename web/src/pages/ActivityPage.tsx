import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { DiskUsagePanel } from '../components/DiskUsagePanel'
import { api } from '../lib/api'

const toneDot: Record<string, string> = {
  ok: 'bg-lime',
  info: 'bg-info',
  warn: 'bg-warn',
  fail: 'bg-danger',
}

type ActivityItem = {
  id: string
  text: string
  tone: string
  created_at: string
}

export function ActivityPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.token) return
    void (async () => {
      try {
        const rows = await api<ActivityItem[]>('/api/activity', {
          token: user.token,
        })
        setItems(rows)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    })()
  }, [user?.token])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-[13px] text-muted">
        Disk usage on the Iskele volume, then build / tar / zip / push history.
      </p>

      <DiskUsagePanel />

      <section>
        <h2 className="mb-3 text-sm font-semibold">Jobs</h2>
        {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}
        <ul className="card divide-y divide-border">
          {items.length === 0 && !error ? (
            <li className="px-4 py-4 text-[13px] text-muted">No jobs yet.</li>
          ) : (
            items.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-4">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    toneDot[a.tone] ?? toneDot.info
                  }`}
                />
                <div>
                  <p className="text-[14px]">{a.text}</p>
                  <p className="mt-1 text-[12px] text-muted">{a.created_at}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
