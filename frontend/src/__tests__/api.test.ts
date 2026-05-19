import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockError(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ detail: 'error' }),
  } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('generateRecommendation', () => {
  it('POSTs to /api/recommendation/generate with ticker param', async () => {
    mockFetch.mockReturnValue(mockOk({ current_price: 97.4, recommended_amount: 620 }))
    const result = await api.generateRecommendation('IWDA.AS')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/recommendation/generate?ticker=IWDA.AS',
      { method: 'POST' }
    )
    expect(result.recommended_amount).toBe(620)
  })

  it('throws on non-2xx', async () => {
    mockFetch.mockReturnValue(mockError(503))
    await expect(api.generateRecommendation('IWDA.AS')).rejects.toThrow('HTTP 503')
  })
})

describe('getSettings', () => {
  it('GETs /api/settings and returns array', async () => {
    mockFetch.mockReturnValue(mockOk([{ id: 1, base_amount: 500, ticker: 'IWDA.AS' }]))
    const result = await api.getSettings()
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', undefined)
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('createSettings', () => {
  it('POSTs /api/settings with JSON body', async () => {
    const body = { base_amount: 400, min_amount: 150, max_amount: 1500, ticker: 'VWRA', risk_profile: 'balanced' as const }
    mockFetch.mockReturnValue(mockOk({ ...body, id: 2 }))
    await api.createSettings(body)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
})

describe('saveSettings', () => {
  it('PUTs /api/settings/{ticker} with body excluding ticker', async () => {
    const update = { base_amount: 500, min_amount: 100, max_amount: 1000, risk_profile: 'balanced' as const }
    mockFetch.mockReturnValue(mockOk({ ...update, id: 1, ticker: 'URTH' }))
    await api.saveSettings('URTH', update)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/URTH', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
  })
})

describe('deleteSettings', () => {
  it('DELETEs /api/settings/{ticker}', async () => {
    mockFetch.mockReturnValue(Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(undefined) } as Response))
    await api.deleteSettings('VWRA')
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/VWRA', { method: 'DELETE' })
  })
})

describe('getHistory', () => {
  it('GETs /api/history without filter', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getHistory()
    expect(mockFetch).toHaveBeenCalledWith('/api/history', undefined)
  })

  it('GETs /api/history?ticker=URTH when ticker provided', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getHistory('URTH')
    expect(mockFetch).toHaveBeenCalledWith('/api/history?ticker=URTH', undefined)
  })
})

describe('getPriceHistory', () => {
  it('GETs /api/market/history with ticker param', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getPriceHistory('IWDA.AS')
    expect(mockFetch).toHaveBeenCalledWith('/api/market/history?ticker=IWDA.AS', undefined)
  })
})
