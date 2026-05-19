import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { History } from '../pages/History'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationRecord } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

// Mock ContributionCalendar to keep History tests focused
vi.mock('../components/ContributionCalendar', () => ({
  ContributionCalendar: () => <div data-testid="contribution-calendar" />,
}))

const mockRow: RecommendationRecord = {
  id: 1, created_at: '2024-03-15T10:00:00Z', ticker: 'URTH',
  market_price: 97.4, drawdown: -0.082, drawdown_pct: -0.082,
  multiplier: 1.2, rule_triggered: '-5% band',
  recommended_amount: 620, executed_amount: null, explanation: '',
}

beforeEach(() => {
  useStore.setState({
    history: [],
    historyLoading: false,
    historyError: null,
    settings: [],
    activeTicker: null,
    recommendations: {},
    recommendationRestoredAt: {},
    recommendationLoading: false,
    recommendationError: null,
    settingsLoading: false,
    settingsError: null,
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

  it('renders both section headers when history has rows', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /contribution calendar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /history table/i })).toBeInTheDocument()
    })
  })

  it('renders ContributionCalendar inside the calendar section', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByTestId('contribution-calendar')).toBeInTheDocument()
    )
  })

  it('renders table rows in the History Table section', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getAllByText('€620')[0]).toBeInTheDocument()
    )
  })

  it('collapses the calendar section when its header is clicked', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByTestId('contribution-calendar')).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /contribution calendar/i }))
    expect(screen.queryByTestId('contribution-calendar')).not.toBeInTheDocument()
  })

  it('collapses the table section when its header is clicked', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getAllByText('€620')[0]).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /history table/i }))
    expect(screen.queryByText('€620')).not.toBeInTheDocument()
  })

  it('shows — for null executed_amount', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() => expect(screen.getAllByText('—')[0]).toBeInTheDocument())
  })

  it('shows ticker filter pills when settings has profiles', async () => {
    const profile = { id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
    useStore.setState({ settings: [profile] })
    mockApi.getHistory.mockResolvedValue([])
    render(<History />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^urth$/i })).toBeInTheDocument()
    })
  })

  it('clicking a ticker pill calls fetchHistory with that ticker', async () => {
    const profile = { id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
    useStore.setState({ settings: [profile] })
    mockApi.getHistory.mockResolvedValue([])
    render(<History />)
    await waitFor(() => screen.getByRole('button', { name: /^urth$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^urth$/i }))
    await waitFor(() => expect(mockApi.getHistory).toHaveBeenCalledWith('URTH'))
  })
})
