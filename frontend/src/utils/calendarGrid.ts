import type { RecommendationRecord } from '../api'

export interface CalendarDay {
  day: number
  record: RecommendationRecord | null
}

/** `dateStr` must include a time component (e.g. ISO-8601 datetime). A bare date string like "2026-05-07" is parsed as UTC midnight and may shift one day in negative-offset timezones. */
function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function buildDayMap(rows: RecommendationRecord[]): Map<string, RecommendationRecord> {
  const executed = rows.filter(r => r.executed_amount !== null)
  executed.sort((a, b) => a.id - b.id)
  const map = new Map<string, RecommendationRecord>()
  for (const r of executed) {
    map.set(toLocalDateKey(r.created_at), r)
  }
  return map
}

export function buildCalendarWeeks(
  month: Date,
  dayMap: Map<string, RecommendationRecord>,
): (CalendarDay | null)[][] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstDow = new Date(year, monthIndex, 1).getDay()

  const cells: (CalendarDay | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, record: dayMap.get(key) ?? null })
  }
  while (cells.length < 42) cells.push(null)

  const weeks: (CalendarDay | null)[][] = []
  for (let i = 0; i < 6; i++) {
    weeks.push(cells.slice(i * 7, i * 7 + 7))
  }
  return weeks
}
