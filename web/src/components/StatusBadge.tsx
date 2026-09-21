import { statusLabel } from '../mock/data'

const tone: Record<string, string> = {
  ready: 'bg-lime/15 text-lime',
  pushed: 'bg-lime/15 text-lime',
  success: 'bg-lime/15 text-lime',
  building: 'bg-info/15 text-info',
  running: 'bg-info/15 text-info',
  queued: 'bg-warn/15 text-warn',
  idle: 'bg-surface-2 text-muted',
  failed: 'bg-danger/15 text-danger',
  default: 'bg-surface-2 text-muted',
}

export function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? 'default'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tone[key] ?? tone.default}`}
    >
      {statusLabel(key)}
    </span>
  )
}
