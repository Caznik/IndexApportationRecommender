import { describe, it, expect } from 'vitest'
import { computePriceChanges } from '../utils/priceChanges'

const makeHistory = (entries: Array<[string, number]>) =>
  entries.map(([date, close_price]) => ({ date, close_price }))

describe('computePriceChanges', () => {
  it('returns nulls for empty array', () => {
    expect(computePriceChanges([])).toEqual({ pctDay: null, pctMonth: null })
  })

  it('returns nulls for single entry', () => {
    const history = makeHistory([['2026-04-16', 100]])
    expect(computePriceChanges(history)).toEqual({ pctDay: null, pctMonth: null })
  })

  it('computes pctDay from last two entries, pctMonth null when history too short', () => {
    const history = makeHistory([
      ['2026-04-14', 100],
      ['2026-04-15', 102],
    ])
    const result = computePriceChanges(history)
    expect(result.pctDay).toBeCloseTo(0.02)
    expect(result.pctMonth).toBeNull()
  })

  it('computes pctMonth using the latest entry whose date is at or before 30 days back', () => {
    const history = makeHistory([
      ['2026-04-01', 200],  // 45 days before last — older than cutoff
      ['2026-04-16', 220],  // on the cutoff date (last - 30 days) — boundary included
      ['2026-05-15', 230],  // prev (yesterday)
      ['2026-05-16', 232],  // last (today)
    ])
    const result = computePriceChanges(history)
    expect(result.pctDay).toBeCloseTo(2 / 230)
    expect(result.pctMonth).toBeCloseTo((232 - 220) / 220)
  })

  it('returns null pctMonth when no entry is 30+ days old', () => {
    const history = makeHistory([
      ['2026-04-20', 100],
      ['2026-04-30', 102],
      ['2026-05-10', 104],
      ['2026-05-15', 106],
      ['2026-05-16', 108],
    ])
    // cutoff = 2026-04-16 — no entry on or before that date
    const result = computePriceChanges(history)
    expect(result.pctDay).toBeCloseTo(2 / 106)
    expect(result.pctMonth).toBeNull()
  })

  it('handles price decrease (negative pctDay)', () => {
    const history = makeHistory([
      ['2026-05-15', 110],
      ['2026-05-16', 99],
    ])
    expect(computePriceChanges(history).pctDay).toBeCloseTo(-11 / 110)
  })

  it('uses the prev entry as monthAgo when history is sparse and prev is 30+ days old', () => {
    const history = makeHistory([
      ['2026-04-15', 180],  // 31 days before last — both prev and month-ago
      ['2026-05-16', 190],  // last
    ])
    const result = computePriceChanges(history)
    expect(result.pctDay).toBeCloseTo(10 / 180)
    expect(result.pctMonth).toBeCloseTo(10 / 180)
  })
})
