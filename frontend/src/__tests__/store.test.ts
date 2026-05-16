import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationResult, RecommendationRecord } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const INITIAL: Partial<ReturnType<typeof useStore.getState>> = {
  recommendation: null,
  recommendationLoading: false,
  recommendationError: null,
  recommendationRestoredAt: null,
  settings: null,
  settingsLoading: false,
  settingsError: null,
  history: [],
  historyLoading: false,
  historyError: null,
}

const mockResult: RecommendationResult = {
  current_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 620,
  explanation: '',
}

const mockRecord: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-14T12:00:00',
  ticker: 'URTH',
  market_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 620,
  executed_amount: null,
  explanation: '',
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
    expect(useStore.getState().recommendationRestoredAt).toBeNull()
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

describe('restoreRecommendation', () => {
  it('does nothing when recommendation is already set', async () => {
    useStore.setState({ recommendation: mockResult })
    await useStore.getState().restoreRecommendation()
    expect(mockApi.getHistory).not.toHaveBeenCalled()
  })

  it('does nothing when history is empty', async () => {
    mockApi.getHistory.mockResolvedValue([])
    await useStore.getState().restoreRecommendation()
    expect(mockApi.getHistory).toHaveBeenCalledOnce()
    expect(useStore.getState().recommendation).toBeNull()
    expect(useStore.getState().recommendationRestoredAt).toBeNull()
  })

  it('restores recommendation from history[0]', async () => {
    mockApi.getHistory.mockResolvedValue([mockRecord])
    await useStore.getState().restoreRecommendation()
    expect(useStore.getState().recommendation).toEqual({
      current_price: mockRecord.market_price,
      drawdown: mockRecord.drawdown,
      drawdown_pct: mockRecord.drawdown_pct,
      multiplier: mockRecord.multiplier,
      recommended_amount: mockRecord.recommended_amount,
      rule_triggered: mockRecord.rule_triggered,
      explanation: mockRecord.explanation,
    })
    expect(useStore.getState().recommendationRestoredAt).toBe(mockRecord.created_at)
  })

  it('does not set error state when getHistory fails', async () => {
    mockApi.getHistory.mockRejectedValue(new Error('network error'))
    await useStore.getState().restoreRecommendation()
    expect(useStore.getState().recommendation).toBeNull()
    expect(useStore.getState().recommendationRestoredAt).toBeNull()
    expect(useStore.getState().recommendationError).toBeNull()
  })
})

describe('markExecuted', () => {
  const updatedRecord: RecommendationRecord = { ...mockRecord, executed_amount: 600 }

  it('replaces matching record in history on success', async () => {
    const other: RecommendationRecord = { ...mockRecord, id: 2 }
    useStore.setState({ history: [mockRecord, other] })
    mockApi.markExecuted.mockResolvedValue(updatedRecord)
    await useStore.getState().markExecuted(1, 600)
    const history = useStore.getState().history
    expect(history[0]).toEqual(updatedRecord)
    expect(history[1]).toEqual(other)
  })

  it('propagates error and leaves history unchanged on failure', async () => {
    useStore.setState({ history: [mockRecord] })
    mockApi.markExecuted.mockRejectedValue(new Error('HTTP 500'))
    await expect(useStore.getState().markExecuted(1, 600)).rejects.toThrow('HTTP 500')
    expect(useStore.getState().history[0]).toEqual(mockRecord)
  })
})
