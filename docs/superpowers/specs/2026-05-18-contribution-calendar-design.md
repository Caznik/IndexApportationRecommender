# Contribution Calendar — Design Spec

**Workitem:** WI-20260518-contributionCalendar  
**Date:** 2026-05-18  
**Status:** Approved

---

## Overview

Add a Contribution Calendar to the History page so users can see their DCA rhythm at a glance — which days they actually put money in and how much — without scanning the full History Table.

---

## Placement

The History page (`frontend/src/pages/History.tsx`) is refactored into **two collapsible sections**, both open by default:

1. **Contribution Calendar** (top)
2. **History Table** (bottom)

Each section has a header row with a title and a chevron icon that rotates when collapsed. Collapse state is managed by two `useState<boolean>` values (`calendarOpen`, `tableOpen`) in `History.tsx`.

---

## What appears on the calendar

- **Executed days** — rows where `executed_amount !== null`. Rendered as highlighted cells (blue-tinted background + border) showing the day number and `€{executed_amount}`.
- **All other days** — plain cells showing only the day number in muted text. This includes days with unexecuted recommendations and days with no activity.

---

## Component: `ContributionCalendar`

**File:** `frontend/src/components/ContributionCalendar.tsx`

**Props:**
```ts
interface Props {
  rows: RecommendationRecord[]
}
```

**Internal state:**
- `currentMonth: Date` — initialized to the current calendar month
- `tooltipRecord: RecommendationRecord | null` — the record whose tooltip is open; `null` when no tooltip is shown

**Data derivation (on render):**
1. Filter `rows` to those where `executed_amount !== null`
2. Key by `YYYY-MM-DD` date string derived from `created_at` (using `new Date(r.created_at).toISOString().slice(0, 10)`)
3. If two records share the same date, keep the one with the highest `id`
4. Build a 6×7 week grid (Sun–Sat) for `currentMonth` in pure JS — no date library required

**Month navigation:**
- Prev (`‹`) and Next (`›`) arrow buttons flank a `MON YYYY` label
- Next button is disabled when `currentMonth` is the current calendar month

**Day cell variants:**
- Empty slot (days before/after the month): blank `div` with fixed height
- Plain day: `#1c1c1c` background, muted day number
- Executed day: `#0099ff18` background, `1px solid #0099ff44` border, white day number + `€{executed_amount}` in accent-blue below it; `cursor-pointer`

**Tooltip:**
- Triggered by clicking an executed day cell
- Clicking the same cell again closes it; clicking a different executed cell switches to that record
- Dismissed by clicking outside the calendar (document `click` listener, removed on unmount) or pressing `Escape`
- Positioned above the cell by default; flips below for cells in the first two calendar rows
- Content: date label, Executed, Recommended, Price, Drawdown (red if `drawdown_pct < -0.10`), Multiplier

---

## Changes to existing files

### `frontend/src/pages/History.tsx`

- Add `calendarOpen` and `tableOpen` state (both `true` by default)
- Render two collapsible sections instead of the current single block
- Pass `history` to `<ContributionCalendar rows={history} />`
- The existing `<HistoryTable>` / `<HistoryCardList>` render logic moves inside the History Table section body unchanged

---

## Edge cases

| Scenario | Behaviour |
|---|---|
| No executed rows in current month | Calendar renders with all plain cells — no empty-state message |
| Multiple executions on same date | Last record by `id` wins |
| Tooltip cell near top of grid (row 0–1) | Tooltip flips to render below the cell |
| `historyLoading` is true | History page shows skeleton; calendar renders after load — no additional loading state |
| Current month selected, Next pressed | Next button is disabled |

---

## No changes required

- Zustand store — no new state or actions
- API layer — no new endpoints or types
- `RecommendationRecord` type — already has all needed fields (`created_at`, `executed_amount`, `recommended_amount`, `market_price`, `drawdown_pct`, `multiplier`, `rule_triggered`)

---

## Testing

- Unit tests for the day-grid computation function: given a set of rows, verify the correct days are highlighted for a given month, correct handling of multi-record same-day, correct week offsets for months starting mid-week
- Unit tests for tooltip open/close behavior (click executed cell → tooltip shown; click outside → tooltip hidden; Escape key → tooltip hidden)
- Render test: `ContributionCalendar` with mock rows renders the expected number of highlighted cells
- `History.tsx` render test: both collapsible sections present; toggling header collapses/expands the body
