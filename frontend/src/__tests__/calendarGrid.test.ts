import { describe, it, expect } from 'vitest'
import type { RecommendationRecord } from '../api'
import { buildDayMap, buildCalendarWeeks } from '../utils/calendarGrid'

function makeRecord(
  id: number,
  created_at: string,
  executed_amount: number | null,
): RecommendationRecord {
  return {
    id, created_at, ticker: 'URTH',
    market_price: 100, drawdown: -0.05, drawdown_pct: -0.05,
    multiplier: 1.0, rule_triggered: 'base', recommended_amount: 150,
    executed_amount, explanation: '',
  }
}

// May 1, 2026 falls on a Friday (index 5, Sun=0)
const MAY_2026 = new Date(2026, 4, 1)

describe('buildDayMap', () => {
  it('includes only rows where executed_amount is not null', () => {
    const rows = [
      makeRecord(1, '2026-05-07T10:00:00Z', 150),
      makeRecord(2, '2026-05-10T10:00:00Z', null),
    ]
    const map = buildDayMap(rows)
    expect(map.size).toBe(1)
    expect(map.has('2026-05-07')).toBe(true)
  })

  it('when two executed records share the same local date, the one with the higher id wins', () => {
    const rows = [
      makeRecord(1, '2026-05-07T08:00:00Z', 100),
      makeRecord(2, '2026-05-07T20:00:00Z', 200),
    ]
    const map = buildDayMap(rows)
    expect(map.size).toBe(1)
    expect(map.get('2026-05-07')?.id).toBe(2)
  })

  it('returns an empty map when no rows are executed', () => {
    const map = buildDayMap([makeRecord(1, '2026-05-07T10:00:00Z', null)])
    expect(map.size).toBe(0)
  })

  it('returns an empty map for an empty input array', () => {
    const map = buildDayMap([])
    expect(map.size).toBe(0)
  })
})

describe('buildCalendarWeeks', () => {
  it('always returns exactly 6 rows of 7 cells', () => {
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    expect(weeks).toHaveLength(6)
    weeks.forEach(week => expect(week).toHaveLength(7))
  })

  it('pads with null cells before the first day of the month', () => {
    // May 2026 starts on Friday — cols 0-4 of week 0 are null
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    expect(weeks[0][0]).toBeNull()
    expect(weeks[0][4]).toBeNull()
  })

  it('places day 1 in the correct day-of-week column', () => {
    // May 1 = Friday = column index 5
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    expect(weeks[0][5]?.day).toBe(1)
  })

  it('marks an executed day with its record', () => {
    // May 7, 2026 is a Thursday = week 1, col 4
    const record = makeRecord(1, '2026-05-07T10:00:00Z', 150)
    const dayMap = buildDayMap([record])
    const weeks = buildCalendarWeeks(MAY_2026, dayMap)
    const cell = weeks[1][4]
    expect(cell?.day).toBe(7)
    expect(cell?.record?.id).toBe(1)
  })

  it('leaves non-executed days with null record', () => {
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    // day 7, week 1, col 4 — no executed record
    expect(weeks[1][4]?.day).toBe(7)
    expect(weeks[1][4]?.record).toBeNull()
  })

  it('pads trailing cells after the last day of the month with null', () => {
    // May has 31 days; May 31 = Sunday = week 5 col 0, rest of row is null
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    expect(weeks[5][0]?.day).toBe(31)
    expect(weeks[5][1]).toBeNull()
  })
})
