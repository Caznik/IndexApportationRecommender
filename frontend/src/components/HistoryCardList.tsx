import { useState } from 'react'
import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}

export function HistoryCardList({ rows, onMarkExecuted }: Props) {
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
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const date = new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
        const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
        const isDeepDrawdown = Number(row.drawdown_pct) < -0.1
        const isEditing = editingId === row.id

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
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
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
                    <p className="text-ink-muted text-sm">
                      {row.executed_amount != null
                        ? `€${Number(row.executed_amount).toFixed(0)}`
                        : '—'}
                    </p>
                    <button
                      onClick={() => startEdit(row)}
                      className="text-xs text-ink-muted hover:text-ink underline"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
