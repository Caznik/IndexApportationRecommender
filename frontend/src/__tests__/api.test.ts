import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
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
  it('POSTs to /api/recommendation/generate', async () => {
    mockFetch.mockReturnValue(mockOk({ current_price: 97.4, recommended_amount: 620 }))
    const result = await api.generateRecommendation()
    expect(mockFetch).toHaveBeenCalledWith('/api/recommendation/generate', {
      method: 'POST',
    })
    expect(result.recommended_amount).toBe(620)
  })

  it('throws on non-2xx', async () => {
    mockFetch.mockReturnValue(mockError(503))
    await expect(api.generateRecommendation()).rejects.toThrow('HTTP 503')
  })
})

describe('getSettings', () => {
  it('GETs /api/settings', async () => {
    mockFetch.mockReturnValue(mockOk({ base_amount: 500 }))
    await api.getSettings()
    expect(mockFetch).toHaveBeenCalledWith('/api/settings')
  })
})

describe('saveSettings', () => {
  it('PUTs /api/settings with JSON body', async () => {
    const update = { base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
    mockFetch.mockReturnValue(mockOk({ ...update, id: 1 }))
    await api.saveSettings(update)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
  })
})

describe('getHistory', () => {
  it('GETs /api/history', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getHistory()
    expect(mockFetch).toHaveBeenCalledWith('/api/history')
  })
})

describe('getPriceHistory', () => {
  it('GETs /api/market/history', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getPriceHistory()
    expect(mockFetch).toHaveBeenCalledWith('/api/market/history')
  })
})
