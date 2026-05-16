import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'
import { HistoryCardList } from '../components/HistoryCardList'

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const markExecuted = useStore((s) => s.markExecuted)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    fetchHistory().finally(() => setHasFetched(true))
  }, [fetchHistory])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">History</h1>

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
        <>
          <div className="block sm:hidden">
            <HistoryCardList rows={history} onMarkExecuted={markExecuted} />
          </div>
          <div className="hidden sm:block bg-surface-1 rounded-xl p-6">
            <HistoryTable rows={history} onMarkExecuted={markExecuted} />
          </div>
        </>
      )}
    </div>
  )
}
