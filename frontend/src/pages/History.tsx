import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'
import { HistoryCardList } from '../components/HistoryCardList'
import { ContributionCalendar } from '../components/ContributionCalendar'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const settings = useStore((s) => s.settings)
  const markExecuted = useStore((s) => s.markExecuted)
  const [hasFetched, setHasFetched] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [tableOpen, setTableOpen] = useState(true)
  const [filterTicker, setFilterTicker] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory().finally(() => setHasFetched(true))
  }, [fetchHistory])

  async function handleFilterChange(ticker: string | null) {
    setFilterTicker(ticker)
    await fetchHistory(ticker ?? undefined)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">History</h1>

      {settings.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => handleFilterChange(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterTicker === null ? 'bg-surface-3 text-ink' : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
            }`}
          >
            All
          </button>
          {settings.map((s) => (
            <button
              key={s.ticker}
              onClick={() => handleFilterChange(s.ticker)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterTicker === s.ticker ? 'bg-surface-3 text-ink' : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
              }`}
            >
              {s.ticker}
            </button>
          ))}
        </div>
      )}

      {historyLoading && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-32" />
      )}

      {historyError && (
        <p className="text-ink-muted text-sm">{historyError}</p>
      )}

      {hasFetched && !historyLoading && !historyError && history.length === 0 && (
        <div className="bg-surface-1 rounded-xl p-8 text-center">
          <p className="text-ink-muted text-sm">
            No recommendations yet. Generate one from the Dashboard.
          </p>
        </div>
      )}

      {!historyLoading && !historyError && history.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="bg-surface-1 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setCalendarOpen(o => !o)}
              aria-expanded={calendarOpen}
            >
              <span className="text-sm font-semibold">Contribution Calendar</span>
              <ChevronIcon open={calendarOpen} />
            </button>
            {calendarOpen && (
              <div className="px-6 pb-6">
                <ContributionCalendar rows={history} />
              </div>
            )}
          </div>

          <div className="bg-surface-1 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setTableOpen(o => !o)}
              aria-expanded={tableOpen}
            >
              <span className="text-sm font-semibold">History Table</span>
              <ChevronIcon open={tableOpen} />
            </button>
            {tableOpen && (
              <div className="px-6 pb-6">
                <div className="block sm:hidden">
                  <HistoryCardList rows={history} onMarkExecuted={markExecuted} />
                </div>
                <div className="hidden sm:block">
                  <HistoryTable rows={history} onMarkExecuted={markExecuted} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
