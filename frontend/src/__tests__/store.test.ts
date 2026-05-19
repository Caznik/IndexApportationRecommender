import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationResult, RecommendationRecord, Settings } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const INITIAL: Partial<ReturnType<typeof useStore.getState>> = {
  recommendations: {},
  recommendationRestoredAt: {},
  recommendationLoading: false,
  recommendationError: null,
  settings: [],
  activeTicker: null,
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

const mockSettings: Settings = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

beforeEach(() => {
  useStore.setState(INITIAL)
  vi.clearAllMocks()
})

describe('generate', () => {
  it('stores result keyed by ticker on success', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    await useStore.getState().generate('IWDA.AS')
    expect(useStore.getState().recommendations['IWDA.AS']).toEqual(mockResult)
    expect(useStore.getState().recommendationLoading).toBe(false)
    expect(useStore.getState().recommendationRestoredAt['IWDA.AS']).toBeNull()
  })

  it('calls generateRecommendation with the given ticker', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    await useStore.getState().generate('VWRA')
    expect(mockApi.generateRecommendation).toHaveBeenCalledWith('VWRA')
  })

  it('sets recommendationError on failure', async () => {
    mockApi.generateRecommendation.mockRejectedValue(new Error('HTTP 503'))
    await useStore.getState().generate('IWDA.AS')
    expect(useStore.getState().recommendationError).toBe('HTTP 503')
    expect(useStore.getState().recommendations['IWDA.AS']).toBeUndefined()
  })
})

describe('fetchSettings', () => {
  it('sets settings array and activeTicker on success', async () => {
    mockApi.getSettings.mockResolvedValue([mockSettings])
    await useStore.getState().fetchSettings()
    expect(useStore.getState().settings).toEqual([mockSettings])
    expect(useStore.getState().activeTicker).toBe('URTH')
  })

  it('does not overwrite activeTicker when already set', async () => {
    useStore.setState({ activeTicker: 'VWRA' })
    mockApi.getSettings.mockResolvedValue([mockSettings])
    await useStore.getState().fetchSettings()
    expect(useStore.getState().activeTicker).toBe('VWRA')
  })
})

describe('setActiveTicker', () => {
  it('updates activeTicker', () => {
    useStore.getState().setActiveTicker('VWRA')
    expect(useStore.getState().activeTicker).toBe('VWRA')
  })
})

describe('createProfile', () => {
  it('calls createSettings and re-fetches list', async () => {
    const body = { base_amount: 400, min_amount: 100, max_amount: 1500, ticker: 'VWRA', risk_profile: 'balanced' as const }
    mockApi.createSettings.mockResolvedValue({ ...body, id: 2 })
    mockApi.getSettings.mockResolvedValue([mockSettings, { ...body, id: 2 }])
    await useStore.getState().createProfile(body)
    expect(mockApi.createSettings).toHaveBeenCalledWith(body)
    expect(useStore.getState().settings).toHaveLength(2)
  })
})

describe('saveProfile', () => {
  it('calls saveSettings with ticker and update, then re-fetches', async () => {
    const update = { base_amount: 600, min_amount: 100, max_amount: 1200, risk_profile: 'aggressive' as const }
    mockApi.saveSettings.mockResolvedValue({ ...mockSettings, ...update })
    mockApi.getSettings.mockResolvedValue([{ ...mockSettings, ...update }])
    await useStore.getState().saveProfile('URTH', update)
    expect(mockApi.saveSettings).toHaveBeenCalledWith('URTH', update)
    expect(useStore.getState().settings[0].base_amount).toBe(600)
  })
})

describe('deleteProfile', () => {
  it('calls deleteSettings and removes ticker from list', async () => {
    useStore.setState({ settings: [mockSettings], activeTicker: 'URTH' })
    mockApi.deleteSettings.mockResolvedValue(undefined)
    mockApi.getSettings.mockResolvedValue([])
    await useStore.getState().deleteProfile('URTH')
    expect(mockApi.deleteSettings).toHaveBeenCalledWith('URTH')
    expect(useStore.getState().settings).toHaveLength(0)
    expect(useStore.getState().activeTicker).toBeNull()
  })
})

describe('fetchHistory', () => {
  it('sets history rows on success', async () => {
    const rows = [mockRecord]
    mockApi.getHistory.mockResolvedValue(rows)
    await useStore.getState().fetchHistory()
    expect(useStore.getState().history).toEqual(rows)
  })

  it('passes ticker filter to getHistory', async () => {
    mockApi.getHistory.mockResolvedValue([])
    await useStore.getState().fetchHistory('URTH')
    expect(mockApi.getHistory).toHaveBeenCalledWith('URTH')
  })
})

describe('restoreRecommendation', () => {
  it('does nothing when recommendation for ticker already set', async () => {
    useStore.setState({ recommendations: { 'URTH': mockResult } })
    await useStore.getState().restoreRecommendation('URTH')
    expect(mockApi.getHistory).not.toHaveBeenCalled()
  })

  it('does nothing when history is empty', async () => {
    mockApi.getHistory.mockResolvedValue([])
    await useStore.getState().restoreRecommendation('URTH')
    expect(useStore.getState().recommendations['URTH']).toBeUndefined()
  })

  it('restores recommendation from history[0] for the given ticker', async () => {
    mockApi.getHistory.mockResolvedValue([mockRecord])
    await useStore.getState().restoreRecommendation('URTH')
    expect(useStore.getState().recommendations['URTH']).toEqual({
      current_price: mockRecord.market_price,
      drawdown: mockRecord.drawdown,
      drawdown_pct: mockRecord.drawdown_pct,
      multiplier: mockRecord.multiplier,
      recommended_amount: mockRecord.recommended_amount,
      rule_triggered: mockRecord.rule_triggered,
      explanation: mockRecord.explanation,
    })
    expect(useStore.getState().recommendationRestoredAt['URTH']).toBe(mockRecord.created_at)
  })

  it('is silent on getHistory failure', async () => {
    mockApi.getHistory.mockRejectedValue(new Error('network error'))
    await useStore.getState().restoreRecommendation('URTH')
    expect(useStore.getState().recommendations['URTH']).toBeUndefined()
    expect(useStore.getState().recommendationError).toBeNull()
  })
})

describe('markExecuted', () => {
  const updatedRecord: RecommendationRecord = { ...mockRecord, executed_amount: 600 }
  const other: RecommendationRecord = { ...mockRecord, id: 2 }

  it('replaces matching record in history on success', async () => {
    useStore.setState({ history: [mockRecord, other] })
    mockApi.markExecuted.mockResolvedValue(updatedRecord)
    await useStore.getState().markExecuted(1, 600)
    expect(useStore.getState().history[0]).toEqual(updatedRecord)
    expect(useStore.getState().history[1]).toEqual(other)
  })

  it('propagates error and leaves history unchanged on failure', async () => {
    useStore.setState({ history: [mockRecord] })
    mockApi.markExecuted.mockRejectedValue(new Error('HTTP 500'))
    await expect(useStore.getState().markExecuted(1, 600)).rejects.toThrow('HTTP 500')
    expect(useStore.getState().history[0]).toEqual(mockRecord)
  })
})
