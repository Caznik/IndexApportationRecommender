import { useState } from 'react'
import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}

const HEADERS = ['Date', 'Price', 'Drawdown', 'Multiplier', 'Recommended', 'Executed']

export function HistoryTable({ rows, onMarkExecuted }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')

  function startEdit(row: RecommendationRecord) {
    setEditingId(row.id)
    setInputValue(
      row.executed_amount !== null
        ? String(row.executed_amount)
        : String(row.recommended_amount)
    )
  }

  async function handleSave(id: number) {
    try {
      await onMarkExecuted(id, parseFloat(inputValue))
      setEditingId(null)
    } catch {
      // keep edit mode open — user can retry or cancel
    }
  }

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
            const isEditing = editingId === row.id
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
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-20 bg-surface-2 text-ink text-sm rounded px-2 py-0.5 border border-hairline"
                      />
                      <button
                        onClick={() => handleSave(row.id)}
                        className="text-xs text-ink-muted hover:text-ink"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-ink-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>
                        {row.executed_amount != null
                          ? `€${Number(row.executed_amount).toFixed(0)}`
                          : '—'}
                      </span>
                      <button
                        onClick={() => startEdit(row)}
                        className="text-xs text-ink-muted hover:text-ink underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
