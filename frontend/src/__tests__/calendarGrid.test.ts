import { describe, it, expect } from 'vitest'
import type { RecommendationRecord } from '../api'
import { buildDayMap, buildCalendarWeeks } from '../utils/calendarGrid'

function makeRecord(
  id: number,
  created_at: string,
  executed_amount: number | null,
  ticker = 'URTH',
): RecommendationRecord {
  return {
    id, created_at, ticker,
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

  it('groups multiple executed records on the same date into an array', () => {
    const rows = [
      makeRecord(1, '2026-05-07T08:00:00Z', 100, 'IWDA.AS'),
      makeRecord(2, '2026-05-07T20:00:00Z', 200, 'VWRA.L'),
    ]
    const map = buildDayMap(rows)
    expect(map.size).toBe(1)
    const day = map.get('2026-05-07')!
    expect(day).toHaveLength(2)
    expect(day[0].id).toBe(1)
    expect(day[1].id).toBe(2)
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

  it('marks an executed day with its records array', () => {
    // May 7, 2026 is a Thursday = week 1, col 4
    const record = makeRecord(1, '2026-05-07T10:00:00Z', 150)
    const dayMap = buildDayMap([record])
    const weeks = buildCalendarWeeks(MAY_2026, dayMap)
    const cell = weeks[1][4]
    expect(cell?.day).toBe(7)
    expect(cell?.records).toHaveLength(1)
    expect(cell?.records[0].id).toBe(1)
  })

  it('aggregates two records on the same day into one cell', () => {
    const rows = [
      makeRecord(1, '2026-05-07T08:00:00Z', 100, 'IWDA.AS'),
      makeRecord(2, '2026-05-07T20:00:00Z', 200, 'VWRA.L'),
    ]
    const dayMap = buildDayMap(rows)
    const weeks = buildCalendarWeeks(MAY_2026, dayMap)
    const cell = weeks[1][4]
    expect(cell?.records).toHaveLength(2)
  })

  it('leaves non-executed days with an empty records array', () => {
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    // day 7, week 1, col 4 — no executed record
    expect(weeks[1][4]?.day).toBe(7)
    expect(weeks[1][4]?.records).toEqual([])
  })

  it('exposes the dateKey on each cell', () => {
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    expect(weeks[0][5]?.dateKey).toBe('2026-05-01')
  })

  it('pads trailing cells after the last day of the month with null', () => {
    // May has 31 days; May 31 = Sunday = week 5 col 0, rest of row is null
    const weeks = buildCalendarWeeks(MAY_2026, new Map())
    expect(weeks[5][0]?.day).toBe(31)
    expect(weeks[5][1]).toBeNull()
  })
})
