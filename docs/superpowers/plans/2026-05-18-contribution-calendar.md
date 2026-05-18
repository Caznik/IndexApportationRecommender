# Contribution Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly contribution calendar to the History page so users can see which days they executed DCA purchases and how much, at a glance.

**Architecture:** Two new collapsible sections replace the current single block in `History.tsx` — "Contribution Calendar" (top) and "History Table" (bottom). A new self-contained `ContributionCalendar` component receives the existing `history` array from the store, filters to executed rows, builds a 6×7 calendar grid via a pure utility function, and manages its own month-navigation and tooltip state. No store, API, or type changes needed.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react, Tailwind CSS (existing project setup)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/utils/calendarGrid.ts` | Pure functions: `buildDayMap` + `buildCalendarWeeks` |
| Create | `frontend/src/__tests__/calendarGrid.test.ts` | Unit tests for grid logic |
| Create | `frontend/src/components/ContributionCalendar.tsx` | Calendar UI component |
| Create | `frontend/src/__tests__/ContributionCalendar.test.tsx` | Component tests |
| Modify | `frontend/src/pages/History.tsx` | Two collapsible sections |
| Modify | `frontend/src/__tests__/History.test.tsx` | Cover new sections |

---

## Task 1: Calendar grid utility — `buildDayMap` and `buildCalendarWeeks`

**Files:**
- Create: `frontend/src/utils/calendarGrid.ts`
- Create: `frontend/src/__tests__/calendarGrid.test.ts`

### Step 1.1 — Write the failing tests

Create `frontend/src/__tests__/calendarGrid.test.ts`:

```ts
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
```

### Step 1.2 — Run tests, confirm they fail

```
cd frontend && npx vitest run src/__tests__/calendarGrid.test.ts
```

Expected: All tests **FAIL** with "Cannot find module '../utils/calendarGrid'".

### Step 1.3 — Implement `calendarGrid.ts`

Create `frontend/src/utils/calendarGrid.ts`:

```ts
import type { RecommendationRecord } from '../api'

export interface CalendarDay {
  day: number
  record: RecommendationRecord | null
}

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
```

### Step 1.4 — Run tests, confirm they all pass

```
cd frontend && npx vitest run src/__tests__/calendarGrid.test.ts
```

Expected: All **8 tests PASS**.

---

## Task 2: `ContributionCalendar` component — grid rendering and month navigation

**Files:**
- Create: `frontend/src/components/ContributionCalendar.tsx`
- Create: `frontend/src/__tests__/ContributionCalendar.test.tsx`

### Step 2.1 — Write the failing tests (grid + month nav only, no tooltip yet)

Create `frontend/src/__tests__/ContributionCalendar.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContributionCalendar } from '../components/ContributionCalendar'
import type { RecommendationRecord } from '../api'

function makeRecord(
  id: number,
  created_at: string,
  executed_amount: number | null,
): RecommendationRecord {
  return {
    id, created_at, ticker: 'URTH',
    market_price: 452.10, drawdown: -0.05, drawdown_pct: -0.05,
    multiplier: 1.0, rule_triggered: 'base', recommended_amount: 150,
    executed_amount, explanation: '',
  }
}

// Pin system time to May 18, 2026 so the initial month is deterministic
function useMay2026() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 4, 18))
}
afterEach(() => vi.useRealTimers())

describe('ContributionCalendar — grid and navigation', () => {
  it('shows the current month label on mount', () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    expect(screen.getByText(/MAY 2026/i)).toBeInTheDocument()
  })

  it('renders an executed day cell with the executed amount', () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    expect(screen.getByText('€150')).toBeInTheDocument()
  })

  it('does not show executed amount for rows with null executed_amount', () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', null)]
    render(<ContributionCalendar rows={rows} />)
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })

  it('navigates to April 2026 when prev is clicked', async () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByText(/APRIL 2026/i)).toBeInTheDocument()
  })

  it('disables the next button when on the current month', () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    expect(screen.getByRole('button', { name: /next month/i })).toBeDisabled()
  })

  it('enables the next button after navigating to a past month', async () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByRole('button', { name: /next month/i })).not.toBeDisabled()
  })
})
```

### Step 2.2 — Run tests, confirm they fail

```
cd frontend && npx vitest run src/__tests__/ContributionCalendar.test.tsx
```

Expected: All tests **FAIL** with "Cannot find module '../components/ContributionCalendar'".

### Step 2.3 — Implement `ContributionCalendar.tsx` (grid + navigation, no tooltip yet)

Create `frontend/src/components/ContributionCalendar.tsx`:

```tsx
import { useState } from 'react'
import type { RecommendationRecord } from '../api'
import { buildCalendarWeeks, buildDayMap } from '../utils/calendarGrid'

interface Props {
  rows: RecommendationRecord[]
}

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function ContributionCalendar({ rows }: Props) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  )

  const dayMap = buildDayMap(rows)
  const weeks = buildCalendarWeeks(currentMonth, dayMap)

  const monthLabel = currentMonth
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()

  const isCurrentMonth =
    currentMonth.getFullYear() === now.getFullYear() &&
    currentMonth.getMonth() === now.getMonth()

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }

  function nextMonth() {
    if (isCurrentMonth) return
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="text-ink-muted hover:text-ink px-2 py-1 text-lg leading-none"
        >
          ‹
        </button>
        <span className="text-xs font-semibold tracking-widest text-ink">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="text-ink-muted hover:text-ink px-2 py-1 text-lg leading-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map(label => (
          <div key={label} className="text-center text-[10px] font-medium text-ink-muted py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            if (!cell) {
              return <div key={`empty-${wi}-${di}`} className="h-11" />
            }
            if (!cell.record) {
              return (
                <div
                  key={`plain-${cell.day}`}
                  className="h-11 rounded-md bg-surface-2 flex items-center justify-center"
                >
                  <span className="text-xs text-ink-muted">{cell.day}</span>
                </div>
              )
            }
            return (
              <div
                key={`exec-${cell.day}`}
                className="h-11 rounded-md bg-[#0099ff18] border border-[#0099ff44] flex flex-col items-center justify-center gap-0.5 cursor-pointer relative"
              >
                <span className="text-xs font-semibold text-ink">{cell.day}</span>
                <span className="text-[9px] font-semibold text-accent-blue">
                  €{Number(cell.record.executed_amount).toFixed(0)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
```

### Step 2.4 — Run tests, confirm they all pass

```
cd frontend && npx vitest run src/__tests__/ContributionCalendar.test.tsx
```

Expected: All **6 tests PASS**.

---

## Task 3: Tooltip on executed day cells

**Files:**
- Modify: `frontend/src/components/ContributionCalendar.tsx`
- Modify: `frontend/src/__tests__/ContributionCalendar.test.tsx`

### Step 3.1 — Add failing tooltip tests

Append to the `describe` block in `frontend/src/__tests__/ContributionCalendar.test.tsx` (inside the file, after the existing tests, still inside `describe`):

```tsx
describe('ContributionCalendar — tooltip', () => {
  it('shows tooltip with record details when an executed cell is clicked', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    await userEvent.click(screen.getByText('€150').closest('div')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    expect(screen.getByText('$452.10')).toBeInTheDocument()
  })

  it('hides the tooltip when Escape is pressed', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    await userEvent.click(screen.getByText('€150').closest('div')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })

  it('closes the tooltip when clicking outside the calendar', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(
      <div>
        <ContributionCalendar rows={rows} />
        <button>outside</button>
      </div>,
    )
    await userEvent.click(screen.getByText('€150').closest('div')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })

  it('closes an open tooltip when the same cell is clicked again', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    const cell = screen.getByText('€150').closest('div')!
    await userEvent.click(cell)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.click(cell)
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })
})
```

### Step 3.2 — Run tests, confirm the new ones fail

```
cd frontend && npx vitest run src/__tests__/ContributionCalendar.test.tsx
```

Expected: First 6 tests **PASS**, 4 tooltip tests **FAIL**.

### Step 3.3 — Add tooltip state and behavior to `ContributionCalendar.tsx`

Replace the full content of `frontend/src/components/ContributionCalendar.tsx` with:

```tsx
import { useState, useEffect, useRef } from 'react'
import type { RecommendationRecord } from '../api'
import { buildCalendarWeeks, buildDayMap } from '../utils/calendarGrid'

interface Props {
  rows: RecommendationRecord[]
}

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function ContributionCalendar({ rows }: Props) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [tooltipRecord, setTooltipRecord] = useState<RecommendationRecord | null>(null)
  const [tooltipWeekIndex, setTooltipWeekIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const dayMap = buildDayMap(rows)
  const weeks = buildCalendarWeeks(currentMonth, dayMap)

  const monthLabel = currentMonth
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()

  const isCurrentMonth =
    currentMonth.getFullYear() === now.getFullYear() &&
    currentMonth.getMonth() === now.getMonth()

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
    setTooltipRecord(null)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
    setTooltipRecord(null)
  }

  function handleCellClick(record: RecommendationRecord, weekIndex: number) {
    if (tooltipRecord?.id === record.id) {
      setTooltipRecord(null)
    } else {
      setTooltipRecord(record)
      setTooltipWeekIndex(weekIndex)
    }
  }

  useEffect(() => {
    if (!tooltipRecord) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setTooltipRecord(null)
    }
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltipRecord(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onDocClick)
    }
  }, [tooltipRecord])

  return (
    <div ref={containerRef}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="text-ink-muted hover:text-ink px-2 py-1 text-lg leading-none"
        >
          ‹
        </button>
        <span className="text-xs font-semibold tracking-widest text-ink">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="text-ink-muted hover:text-ink px-2 py-1 text-lg leading-none disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABELS.map(label => (
          <div key={label} className="text-center text-[10px] font-medium text-ink-muted py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            if (!cell) {
              return <div key={`empty-${wi}-${di}`} className="h-11" />
            }
            if (!cell.record) {
              return (
                <div
                  key={`plain-${cell.day}`}
                  className="h-11 rounded-md bg-surface-2 flex items-center justify-center"
                >
                  <span className="text-xs text-ink-muted">{cell.day}</span>
                </div>
              )
            }
            const record = cell.record
            const isOpen = tooltipRecord?.id === record.id
            const flipBelow = tooltipWeekIndex <= 1
            return (
              <div
                key={`exec-${cell.day}`}
                className="h-11 rounded-md bg-[#0099ff18] border border-[#0099ff44] flex flex-col items-center justify-center gap-0.5 cursor-pointer relative"
                onClick={() => handleCellClick(record, wi)}
              >
                <span className="text-xs font-semibold text-ink">{cell.day}</span>
                <span className="text-[9px] font-semibold text-accent-blue">
                  €{Number(record.executed_amount).toFixed(0)}
                </span>
                {isOpen && (
                  <div
                    className={`absolute ${flipBelow ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'} left-1/2 -translate-x-1/2 bg-surface-2 border border-hairline rounded-lg p-3 z-10 shadow-xl min-w-[160px] whitespace-nowrap`}
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="text-[11px] text-ink-muted font-medium mb-2">
                      {new Date(record.created_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <span className="text-[10px] text-ink-muted">Executed</span>
                      <span className="text-[10px] text-ink font-semibold">
                        €{Number(record.executed_amount).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-ink-muted">Recommended</span>
                      <span className="text-[10px] text-ink">
                        €{Number(record.recommended_amount).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-ink-muted">Price</span>
                      <span className="text-[10px] text-ink">
                        ${Number(record.market_price).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-ink-muted">Drawdown</span>
                      <span
                        className={`text-[10px] font-medium ${
                          Number(record.drawdown_pct) < -0.1 ? 'text-red-400' : 'text-ink'
                        }`}
                      >
                        {(Number(record.drawdown_pct) * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-ink-muted">Multiplier</span>
                      <span className="text-[10px] text-ink">
                        {Number(record.multiplier).toFixed(1)}×
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
```

### Step 3.4 — Run all component tests, confirm they all pass

```
cd frontend && npx vitest run src/__tests__/ContributionCalendar.test.tsx
```

Expected: All **10 tests PASS**.

---

## Task 4: Refactor `History.tsx` into two collapsible sections

**Files:**
- Modify: `frontend/src/pages/History.tsx`
- Modify: `frontend/src/__tests__/History.test.tsx`

### Step 4.1 — Add failing tests for the new History structure

Replace the full content of `frontend/src/__tests__/History.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { History } from '../pages/History'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationRecord } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

// Mock ContributionCalendar to keep History tests focused
vi.mock('../components/ContributionCalendar', () => ({
  ContributionCalendar: () => <div data-testid="contribution-calendar" />,
}))

const mockRow: RecommendationRecord = {
  id: 1, created_at: '2024-03-15T10:00:00Z', ticker: 'URTH',
  market_price: 97.4, drawdown: -0.082, drawdown_pct: -0.082,
  multiplier: 1.2, rule_triggered: '-5% band',
  recommended_amount: 620, executed_amount: null, explanation: '',
}

beforeEach(() => {
  useStore.setState({
    history: [], historyLoading: false, historyError: null,
    recommendation: null, recommendationLoading: false, recommendationError: null,
    settings: null, settingsLoading: false, settingsError: null,
  })
  vi.clearAllMocks()
})

describe('History', () => {
  it('shows empty state after fetching zero rows', async () => {
    mockApi.getHistory.mockResolvedValue([])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByText(/no recommendations yet/i)).toBeInTheDocument()
    )
  })

  it('renders both section headers when history has rows', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /contribution calendar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /history table/i })).toBeInTheDocument()
    })
  })

  it('renders ContributionCalendar inside the calendar section', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByTestId('contribution-calendar')).toBeInTheDocument()
    )
  })

  it('renders table rows in the History Table section', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getAllByText('€620')[0]).toBeInTheDocument()
    )
  })

  it('collapses the calendar section when its header is clicked', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByTestId('contribution-calendar')).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /contribution calendar/i }))
    expect(screen.queryByTestId('contribution-calendar')).not.toBeInTheDocument()
  })

  it('collapses the table section when its header is clicked', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() =>
      expect(screen.getAllByText('€620')[0]).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /history table/i }))
    expect(screen.queryByText('€620')).not.toBeInTheDocument()
  })

  it('shows — for null executed_amount', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() => expect(screen.getAllByText('—')[0]).toBeInTheDocument())
  })
})
```

### Step 4.2 — Run tests, confirm new ones fail

```
cd frontend && npx vitest run src/__tests__/History.test.tsx
```

Expected: "shows empty state" and "shows — for null" **PASS**, remaining 5 tests **FAIL**.

### Step 4.3 — Rewrite `History.tsx`

Replace the full content of `frontend/src/pages/History.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'
import { HistoryCardList } from '../components/HistoryCardList'
import { ContributionCalendar } from '../components/ContributionCalendar'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const markExecuted = useStore((s) => s.markExecuted)
  const [hasFetched, setHasFetched] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [tableOpen, setTableOpen] = useState(true)

  useEffect(() => {
    fetchHistory().finally(() => setHasFetched(true))
  }, [fetchHistory])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">History</h1>

      {historyLoading && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-32" />
      )}

      {historyError && (
        <p className="text-ink-muted text-sm">{historyError}</p>
      )}

      {hasFetched && !historyLoading && !historyError && history.length === 0 && (
        <div className="bg-surface-1 rounded-xl p-8 text-center">
          <p className="text-ink-muted text-sm">
            No recommendations yet. Generate one from the Dashboard.
          </p>
        </div>
      )}

      {!historyLoading && !historyError && history.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Contribution Calendar section */}
          <div className="bg-surface-1 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setCalendarOpen(o => !o)}
              aria-expanded={calendarOpen}
              aria-label="Contribution Calendar"
            >
              <span className="text-sm font-semibold">Contribution Calendar</span>
              <ChevronIcon open={calendarOpen} />
            </button>
            {calendarOpen && (
              <div className="px-6 pb-6">
                <ContributionCalendar rows={history} />
              </div>
            )}
          </div>

          {/* History Table section */}
          <div className="bg-surface-1 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setTableOpen(o => !o)}
              aria-expanded={tableOpen}
              aria-label="History Table"
            >
              <span className="text-sm font-semibold">History Table</span>
              <ChevronIcon open={tableOpen} />
            </button>
            {tableOpen && (
              <div className="px-6 pb-6">
                <div className="block sm:hidden">
                  <HistoryCardList rows={history} onMarkExecuted={markExecuted} />
                </div>
                <div className="hidden sm:block">
                  <HistoryTable rows={history} onMarkExecuted={markExecuted} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Step 4.4 — Run all History tests, confirm they all pass

```
cd frontend && npx vitest run src/__tests__/History.test.tsx
```

Expected: All **7 tests PASS**.

### Step 4.5 — Run the full test suite to confirm no regressions

```
cd frontend && npx vitest run
```

Expected: All tests across all files **PASS**.

---

## Self-Review Checklist (completed inline)

- **Spec coverage:**
  - ✅ History page with two collapsible sections → Task 4
  - ✅ Only executed rows on calendar → `buildDayMap` in Task 1
  - ✅ Day cell shows date + amount → Task 2 step 2.3
  - ✅ Tooltip on click with full record details → Task 3
  - ✅ Tooltip flips below for top rows → `flipBelow = tooltipWeekIndex <= 1` in Task 3
  - ✅ Next button disabled on current month → Task 2 test + implementation
  - ✅ Multiple executions same day: last id wins → `buildDayMap` sort in Task 1
  - ✅ Escape / outside click dismiss → Task 3

- **Placeholders:** None.

- **Type consistency:** `CalendarDay`, `buildDayMap`, `buildCalendarWeeks` defined in Task 1 and imported exactly in Tasks 2 and 3. `RecommendationRecord` from `../api` throughout. All prop interfaces match usage.
