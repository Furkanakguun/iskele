import { ACTIVITIES } from '../mock/data'

const toneDot: Record<string, string> = {
  ok: 'bg-lime',
  info: 'bg-info',
  warn: 'bg-warn',
  fail: 'bg-danger',
}

export function ActivityPage() {
  return (
    <div>
      <p className="text-[13px] text-muted">
        Build / tar / zip / push history (mock).
      </p>
      <ul className="card mt-5 divide-y divide-border">
        {ACTIVITIES.map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-4 py-4">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[a.tone]}`}
            />
            <div>
              <p className="text-[14px]">{a.text}</p>
              <p className="mt-1 text-[12px] text-muted">{a.timeAgo}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
