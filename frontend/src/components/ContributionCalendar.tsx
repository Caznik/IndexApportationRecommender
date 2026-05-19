import { useState, useEffect, useRef } from 'react'
import type { RecommendationRecord } from '../api'
import { buildCalendarWeeks, buildDayMap } from '../utils/calendarGrid'

interface Props {
  rows: RecommendationRecord[]
}

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const SEVERE_DRAWDOWN = -10

export function ContributionCalendar({ rows }: Props) {
  const nowRef = useRef(new Date())
  const now = nowRef.current
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [tooltip, setTooltip] = useState<{ dateKey: string; weekIndex: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const dayMap = buildDayMap(rows)
  const weeks = buildCalendarWeeks(currentMonth, dayMap)

  const monthLabel = currentMonth
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()

  const isCurrentMonth =
    currentMonth.getFullYear() === now.getFullYear() &&
    currentMonth.getMonth() === now.getMonth()

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
    setTooltip(null)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
    setTooltip(null)
  }

  function handleCellClick(dateKey: string, weekIndex: number) {
    if (tooltip?.dateKey === dateKey) {
      setTooltip(null)
    } else {
      setTooltip({ dateKey, weekIndex })
    }
  }

  useEffect(() => {
    if (!tooltip) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setTooltip(null)
    }
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltip(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [tooltip])

  return (
    <div ref={containerRef}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="text-ink-muted hover:text-ink px-2 py-1 text-lg leading-none"
        >
          ‹
        </button>
        <span className="text-xs font-semibold tracking-widest text-ink">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="text-ink-muted hover:text-ink px-2 py-1 text-lg leading-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map(label => (
          <div key={label} className="text-center text-[10px] font-medium text-ink-muted py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            if (!cell) {
              return <div key={`empty-${wi}-${di}`} className="h-11" />
            }
            if (cell.records.length === 0) {
              return (
                <div
                  key={`plain-${cell.dateKey}`}
                  className="h-11 rounded-md bg-surface-2 flex items-center justify-center"
                >
                  <span className="text-xs text-ink-muted">{cell.day}</span>
                </div>
              )
            }
            const totalExecuted = cell.records.reduce(
              (sum, r) => sum + Number(r.executed_amount),
              0,
            )
            const isOpen = tooltip?.dateKey === cell.dateKey
            const dateLabel = new Date(cell.dateKey + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })
            return (
              <button
                key={`exec-${cell.dateKey}`}
                type="button"
                className="h-11 rounded-md bg-accent-blue/10 border border-accent-blue/25 flex flex-col items-center justify-center gap-0.5 relative"
                onClick={() => handleCellClick(cell.dateKey, wi)}
                aria-label={`${dateLabel}: €${totalExecuted.toFixed(0)} contributed`}
              >
                <span className="text-xs font-semibold text-ink">{cell.day}</span>
                <span className="text-[9px] font-semibold text-accent-blue">
                  €{totalExecuted.toFixed(0)}
                </span>
                {isOpen && (
                  <div
                    className={`absolute ${(tooltip?.weekIndex ?? 0) <= 1 ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'} left-1/2 -translate-x-1/2 bg-surface-2 border border-hairline rounded-lg p-3 z-10 shadow-xl min-w-[160px] whitespace-nowrap`}
                  >
                    <p className="text-[11px] text-ink-muted font-medium mb-2">{dateLabel}</p>
                    {cell.records.map((record, i) => (
                      <div key={record.id} className={i > 0 ? 'mt-2 pt-2 border-t border-hairline' : ''}>
                        {cell.records.length > 1 && (
                          <p className="text-[10px] text-accent-blue font-semibold mb-1">{record.ticker}</p>
                        )}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          <span className="text-[10px] text-ink-muted">Executed</span>
                          <span className="text-[10px] text-ink font-semibold">
                            €{Number(record.executed_amount).toFixed(0)}
                          </span>
                          <span className="text-[10px] text-ink-muted">Recommended</span>
                          <span className="text-[10px] text-ink">
                            €{Number(record.recommended_amount).toFixed(0)}
                          </span>
                          <span className="text-[10px] text-ink-muted">Price</span>
                          <span className="text-[10px] text-ink">
                            ${Number(record.market_price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-ink-muted">Drawdown</span>
                          <span
                            className={`text-[10px] font-medium ${
                              Number(record.drawdown_pct) < SEVERE_DRAWDOWN ? 'text-red-400' : 'text-ink'
                            }`}
                          >
                            {Number(record.drawdown_pct).toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-ink-muted">Multiplier</span>
                          <span className="text-[10px] text-ink">
                            {Number(record.multiplier).toFixed(1)}×
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
