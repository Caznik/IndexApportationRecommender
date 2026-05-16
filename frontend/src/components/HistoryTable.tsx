import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
}

const HEADERS = ['Date', 'Price', 'Drawdown', 'Multiplier', 'Recommended', 'Executed']

export function HistoryTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h}
                className="text-left text-ink text-xs font-medium uppercase tracking-wider pb-3 pr-4"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const date = new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
            const isDeepDrawdown = Number(row.drawdown_pct) < -0.1
            return (
              <tr key={row.id} className="border-t border-hairline-soft">
                <td className="text-ink-muted py-3 pr-4">{date}</td>
                <td className="text-ink-muted py-3 pr-4">${Number(row.market_price).toFixed(2)}</td>
                <td className={`py-3 pr-4 ${isDeepDrawdown ? 'text-red-400' : 'text-ink-muted'}`}>
                  {drawdownPct}
                </td>
                <td className="text-ink-muted py-3 pr-4">{Number(row.multiplier).toFixed(1)}×</td>
                <td className="text-ink py-3 pr-4 font-medium">€{Number(row.recommended_amount).toFixed(0)}</td>
                <td className="text-ink-muted py-3 pr-4">
                  {row.executed_amount != null
                    ? `€${Number(row.executed_amount).toFixed(0)}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
