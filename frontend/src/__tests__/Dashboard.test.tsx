import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../pages/Dashboard'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationResult, Settings } from '../api'

// Mock API module — store actions call api functions internally
vi.mock('../api')
const mockApi = vi.mocked(api)

// Mock PriceChart to avoid Recharts/SVG complexity in unit tests
vi.mock('../components/PriceChart', () => ({
  PriceChart: () => <div data-testid="price-chart" />,
}))

const mockSettings: Settings = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

const mockResult: RecommendationResult = {
  current_price: 97.4, drawdown: -0.082, drawdown_pct: -0.082, multiplier: 1.2,
  recommended_amount: 620, rule_triggered: '-5% band', explanation: '',
}

beforeEach(() => {
  // Reset real store state before each test
  useStore.setState({
    recommendation: null,
    recommendationLoading: false,
    recommendationError: null,
    settings: mockSettings,
    settingsLoading: false,
    settingsError: null,
    history: [],
    historyLoading: false,
    historyError: null,
  })
  vi.clearAllMocks()
  mockApi.getPriceHistory.mockResolvedValue([])
  mockApi.getSettings.mockResolvedValue(mockSettings)
})

describe('Dashboard', () => {
  it('renders empty state when no recommendation', () => {
    render(<Dashboard />)
    expect(screen.getByText('No recommendation yet')).toBeInTheDocument()
  })

  it('calls POST /api/recommendation/generate when Generate clicked', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() => expect(mockApi.generateRecommendation).toHaveBeenCalledOnce())
  })

  it('renders recommended amount after successful generate', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() => expect(screen.getByText('€620')).toBeInTheDocument())
  })

  it('shows loading state while generating', async () => {
    // Never resolves during this test — keeps loading state visible
    mockApi.generateRecommendation.mockReturnValue(new Promise(() => {}))
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
    )
  })

  it('displays 1d price change badge from priceHistory without requiring generate', async () => {
    useStore.setState({ recommendation: mockResult })
    mockApi.getPriceHistory.mockResolvedValue([
      { date: '2026-05-15', close_price: 100 },
      { date: '2026-05-16', close_price: 102 },
    ])
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('+2.0%')).toBeInTheDocument()
    })
  })

  it('displays 1m price change badge when history spans 30+ days', async () => {
    useStore.setState({ recommendation: mockResult })
    mockApi.getPriceHistory.mockResolvedValue([
      { date: '2026-04-16', close_price: 80 },   // exactly 30 days before last — month anchor
      { date: '2026-05-15', close_price: 100 },
      { date: '2026-05-16', close_price: 102 },
    ])
    render(<Dashboard />)
    // pctMonth = (102 - 80) / 80 = 0.275 = +27.5%
    await waitFor(() => {
      expect(screen.getByText('+27.5%')).toBeInTheDocument()
    })
  })
})
