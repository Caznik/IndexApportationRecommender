import { useEffect, useState } from 'react'
import { getOutcomes, type OutcomeResponse, type OutcomeSnapshot } from '../api'

interface Props {
  id: number
}

function SnapshotChip({ label, snapshot }: { label: string; snapshot: OutcomeSnapshot }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-surface-2 rounded-lg px-3 py-2 flex-1">
      <span className="text-ink-muted text-xs uppercase tracking-wider">{label}</span>
      {snapshot.status === 'available' ? (
        <span
          className={`text-sm font-semibold ${snapshot.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {snapshot.pct >= 0 ? '+' : ''}
          {Number(snapshot.pct).toFixed(1)}%
        </span>
      ) : (
        <span className="text-ink-muted text-xs font-medium">
          {snapshot.days_remaining > 0 ? `in ${snapshot.days_remaining}d` : '—'}
        </span>
      )}
    </div>
  )
}

export function OutcomePanel({ id }: Props) {
  const [fetchState, setFetchState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [data, setData] = useState<OutcomeResponse | null>(null)

  useEffect(() => {
    getOutcomes(id)
      .then((res) => {
        setData(res)
        setFetchState('loaded')
      })
      .catch(() => setFetchState('error'))
  }, [id])

  if (fetchState === 'loading') {
    return <p className="text-ink-muted text-xs mt-2">Loading outcomes…</p>
  }
  if (fetchState === 'error') {
    return <p className="text-ink-muted text-xs mt-2">Could not load outcomes</p>
  }
  if (data === null) return null

  return (
    <div className="mt-3 pt-3 border-t border-hairline-soft">
      <p className="text-ink-muted text-xs font-medium uppercase tracking-wider mb-2">Entry outcomes</p>
      <div className="flex gap-2">
        <SnapshotChip label="1m" snapshot={data.one_m} />
        <SnapshotChip label="3m" snapshot={data.three_m} />
        <SnapshotChip label="6m" snapshot={data.six_m} />
      </div>
    </div>
  )
}
