import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
}

export function HistoryCardList({ rows }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const date = new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
        const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
        const isDeepDrawdown = Number(row.drawdown_pct) < -0.1

        return (
          <div key={row.id} className="bg-surface-1 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-ink font-semibold text-sm">{date}</span>
              <span className={`text-sm ${isDeepDrawdown ? 'text-red-400' : 'text-ink-muted'}`}>
                {drawdownPct}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Price</p>
                <p className="text-ink-muted text-sm">${Number(row.market_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Multiplier</p>
                <p className="text-ink-muted text-sm">{Number(row.multiplier).toFixed(1)}×</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Recommended</p>
                <p className="text-ink font-medium text-sm">€{Number(row.recommended_amount).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Executed</p>
                <p className="text-ink-muted text-sm">
                  {row.executed_amount != null
                    ? `€${Number(row.executed_amount).toFixed(0)}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
