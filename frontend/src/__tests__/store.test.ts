import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store'
import * as api from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const INITIAL: Partial<ReturnType<typeof useStore.getState>> = {
  recommendation: null,
  recommendationLoading: false,
  recommendationError: null,
  settings: null,
  settingsLoading: false,
  settingsError: null,
  history: [],
  historyLoading: false,
  historyError: null,
}

beforeEach(() => {
  useStore.setState(INITIAL)
  vi.clearAllMocks()
})

describe('generate', () => {
  it('sets recommendation on success', async () => {
    const result = { current_price: 97, recommended_amount: 620, drawdown: -0.08, drawdown_pct: -0.08, multiplier: 1.2, rule_triggered: '-5% band', explanation: '' }
    mockApi.generateRecommendation.mockResolvedValue(result)
    await useStore.getState().generate()
    expect(useStore.getState().recommendation).toEqual(result)
    expect(useStore.getState().recommendationLoading).toBe(false)
  })

  it('sets recommendationError on failure', async () => {
    mockApi.generateRecommendation.mockRejectedValue(new Error('HTTP 503'))
    await useStore.getState().generate()
    expect(useStore.getState().recommendationError).toBe('HTTP 503')
    expect(useStore.getState().recommendation).toBeNull()
  })
})

describe('fetchSettings', () => {
  it('sets settings on success', async () => {
    const s = { id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
    mockApi.getSettings.mockResolvedValue(s)
    await useStore.getState().fetchSettings()
    expect(useStore.getState().settings).toEqual(s)
  })
})

describe('saveSettings', () => {
  it('updates settings slice on success', async () => {
    const update = { base_amount: 600, min_amount: 100, max_amount: 1200, ticker: 'URTH', risk_profile: 'aggressive' as const }
    const saved = { id: 1, ...update }
    mockApi.saveSettings.mockResolvedValue(saved)
    await useStore.getState().saveSettings(update)
    expect(useStore.getState().settings).toEqual(saved)
  })
})

describe('fetchHistory', () => {
  it('sets history rows on success', async () => {
    const rows = [{ id: 1, created_at: '2024-01-01T00:00:00Z', ticker: 'URTH', market_price: 97, drawdown: -0.08, drawdown_pct: -0.08, multiplier: 1.2, rule_triggered: '-5% band', recommended_amount: 620, executed_amount: null, explanation: '' }]
    mockApi.getHistory.mockResolvedValue(rows)
    await useStore.getState().fetchHistory()
    expect(useStore.getState().history).toEqual(rows)
  })
})
