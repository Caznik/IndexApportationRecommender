interface Props {
  label: string
  value: string | null
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-surface-1 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-ink-muted text-xs font-medium uppercase tracking-wider">
        {label}
      </span>
      <span className="text-ink text-lg font-semibold tracking-tight">
        {value ?? '—'}
      </span>
    </div>
  )
}
