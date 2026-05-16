import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { History } from '../pages/History'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationRecord } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const mockRow: RecommendationRecord = {
  id: 1, created_at: '2024-03-15T10:00:00Z', ticker: 'URTH',
  market_price: 97.4, drawdown: -0.082, drawdown_pct: -0.082,
  multiplier: 1.2, rule_triggered: '-5% band',
  recommended_amount: 620, executed_amount: null, explanation: '',
}

beforeEach(() => {
  useStore.setState({
    history: [], historyLoading: false, historyError: null,
    recommendation: null, recommendationLoading: false, recommendationError: null,
    settings: null, settingsLoading: false, settingsError: null,
  })
  vi.clearAllMocks()
})

describe('History', () => {
  it('shows empty state after fetching zero rows', async () => {
    mockApi.getHistory.mockResolvedValue([])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByText(/no recommendations yet/i)).toBeInTheDocument()
    )
  })

  it('renders a row for each recommendation', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    // €620 and 1.2× appear in both HistoryCardList and HistoryTable (jsdom renders both)
    await waitFor(() => {
      expect(screen.getAllByText('€620')[0]).toBeInTheDocument()
      expect(screen.getAllByText('1.2×')[0]).toBeInTheDocument()
    })
  })

  it('shows — for null executed_amount', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    // — appears in both components
    await waitFor(() => expect(screen.getAllByText('—')[0]).toBeInTheDocument())
  })
})
