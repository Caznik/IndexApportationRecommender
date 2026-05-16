# Mobile-Responsive Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing React/Vite/TypeScript SPA fully usable at 375px viewport without touching the desktop layout.

**Architecture:** Hybrid approach — new components (`BottomNav`, `HistoryCardList`) where mobile structure differs fundamentally from desktop; Tailwind `sm:` responsive prefixes for all other cosmetic/spacing adjustments. The 640px (`sm:`) breakpoint is the single mobile/desktop boundary throughout. No API, store, or backend changes.

**Tech Stack:** React 19, Vite 5, TypeScript, Tailwind CSS v3 (custom tokens in `tailwind.config.ts`), React Router v6, Vitest + @testing-library/react

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/components/BottomNav.tsx` | Fixed bottom tab bar, mobile only (`sm:hidden`) |
| Create | `frontend/src/__tests__/BottomNav.test.tsx` | Tests for BottomNav |
| Create | `frontend/src/components/HistoryCardList.tsx` | Card-per-row history list for mobile |
| Create | `frontend/src/__tests__/HistoryCardList.test.tsx` | Tests for HistoryCardList |
| Modify | `frontend/src/App.tsx` | Hide top pills on mobile, add BottomNav, fix main padding |
| Modify | `frontend/src/pages/Dashboard.tsx` | Responsive stat card grid |
| Modify | `frontend/src/components/HeroCard.tsx` | Responsive padding + font size |
| Modify | `frontend/src/pages/History.tsx` | Render both HistoryCardList + HistoryTable |
| Modify | `frontend/src/__tests__/History.test.tsx` | Fix getByText → getAllByText for duplicated values |

---

## Task 1: BottomNav component

**Files:**
- Create: `frontend/src/components/BottomNav.tsx`
- Create: `frontend/src/__tests__/BottomNav.test.tsx`

### Background

The existing top nav in `App.tsx` has brand text + 3 `<NavLink>` pills. On a 375px screen these overflow. On mobile (`< sm:`), the pills are hidden and `BottomNav` provides navigation instead via a fixed bottom bar.

Design tokens used (defined in `tailwind.config.ts`):
- `bg-canvas` = `#090909`, `border-hairline` = `#262626`
- `text-ink` = `#ffffff`, `text-ink-muted` = `#999999`
- `border-grad-violet` = `#6a4cf5`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/BottomNav.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  it('renders all three tab labels', () => {
    renderNav()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('active tab has border-grad-violet class', () => {
    renderNav('/settings')
    const link = screen.getByText('Settings').closest('a')!
    expect(link).toHaveClass('border-grad-violet')
  })

  it('inactive tabs do not have border-grad-violet class', () => {
    renderNav('/settings')
    expect(screen.getByText('Dashboard').closest('a')).not.toHaveClass('border-grad-violet')
    expect(screen.getByText('History').closest('a')).not.toHaveClass('border-grad-violet')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```powershell
cd C:\lab\Proyectos\IndexApportationRecommender\frontend
npm run test:run -- BottomNav
```

Expected: FAIL — `Cannot find module '../components/BottomNav'`

- [ ] **Step 3: Implement BottomNav**

Create `frontend/src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/history', label: 'History', end: false },
]

export function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-canvas border-t border-hairline flex items-stretch justify-around z-50">
      {TABS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 text-xs font-medium transition-colors ${
              isActive
                ? 'text-ink border-t-2 border-grad-violet'
                : 'text-ink-muted border-t-2 border-transparent'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```powershell
npm run test:run -- BottomNav
```

Expected: 3/3 PASS

---

## Task 2: HistoryCardList component

**Files:**
- Create: `frontend/src/components/HistoryCardList.tsx`
- Create: `frontend/src/__tests__/HistoryCardList.test.tsx`

### Background

`HistoryTable` renders a 6-column table (too wide for 375px). On mobile, `HistoryCardList` renders the same data as one card per row. The `RecommendationRecord` type (from `frontend/src/api.ts`) has these fields used here: `id`, `created_at`, `market_price`, `drawdown_pct`, `multiplier`, `recommended_amount`, `executed_amount`.

Formatting rules (identical to `HistoryTable`):
- Date: `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`
- Drawdown: `(Number(row.drawdown_pct) * 100).toFixed(1) + '%'` (e.g. `-0.082` → `"-8.2%"`)
- Deep drawdown: `Number(row.drawdown_pct) < -0.1` → `text-red-400`
- Market price: `$` prefix, `.toFixed(2)`
- Amounts: `€` prefix, `.toFixed(0)`
- Null executed_amount: display `—`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/HistoryCardList.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryCardList } from '../components/HistoryCardList'
import type { RecommendationRecord } from '../api'

const baseRow: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-15T10:00:00Z',
  ticker: 'URTH',
  market_price: 512.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 600,
  executed_amount: null,
  explanation: '',
}

describe('HistoryCardList', () => {
  it('renders one card per row', () => {
    const rows = [baseRow, { ...baseRow, id: 2 }]
    render(<HistoryCardList rows={rows} />)
    expect(screen.getAllByText('May 15, 2026')).toHaveLength(2)
  })

  it('formats drawdown by multiplying by 100', () => {
    render(<HistoryCardList rows={[baseRow]} />)
    expect(screen.getByText('-8.2%')).toBeInTheDocument()
  })

  it('shows — for null executed_amount', () => {
    render(<HistoryCardList rows={[baseRow]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows formatted executed amount when present', () => {
    render(<HistoryCardList rows={[{ ...baseRow, executed_amount: 600 }]} />)
    expect(screen.getAllByText('€600')).toHaveLength(2)
  })

  it('applies text-red-400 for deep drawdown (drawdown_pct < -0.1)', () => {
    render(<HistoryCardList rows={[{ ...baseRow, drawdown_pct: -0.15, drawdown: -0.15 }]} />)
    expect(screen.getByText('-15.0%')).toHaveClass('text-red-400')
  })

  it('does not apply text-red-400 for shallow drawdown', () => {
    render(<HistoryCardList rows={[baseRow]} />)
    expect(screen.getByText('-8.2%')).not.toHaveClass('text-red-400')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```powershell
npm run test:run -- HistoryCardList
```

Expected: FAIL — `Cannot find module '../components/HistoryCardList'`

- [ ] **Step 3: Implement HistoryCardList**

Create `frontend/src/components/HistoryCardList.tsx`:

```tsx
import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
}

export function HistoryCardList({ rows }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const date = new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
        const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
        const isDeepDrawdown = Number(row.drawdown_pct) < -0.1

        return (
          <div key={row.id} className="bg-surface-1 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-ink font-semibold text-sm">{date}</span>
              <span className={`text-sm ${isDeepDrawdown ? 'text-red-400' : 'text-ink-muted'}`}>
                {drawdownPct}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Price</p>
                <p className="text-ink-muted text-sm">${Number(row.market_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Multiplier</p>
                <p className="text-ink-muted text-sm">{Number(row.multiplier).toFixed(1)}×</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Recommended</p>
                <p className="text-ink font-medium text-sm">€{Number(row.recommended_amount).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Executed</p>
                <p className="text-ink-muted text-sm">
                  {row.executed_amount != null
                    ? `€${Number(row.executed_amount).toFixed(0)}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```powershell
npm run test:run -- HistoryCardList
```

Expected: 6/6 PASS

---

## Task 3: App.tsx — mobile nav wiring

**Files:**
- Modify: `frontend/src/App.tsx`

### Background

Current `App.tsx` (full file for reference):

```tsx
import { NavLink, Outlet } from 'react-router-dom'

const TAB_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/history', label: 'History', end: false },
]

export function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-body">
      <nav className="h-14 bg-canvas border-b border-hairline flex items-center px-6">
        <span className="text-sm font-semibold tracking-tight text-ink">
          IndexApportationRecommender
        </span>
        <div className="flex gap-1 ml-auto">
          {TAB_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-pill text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-2 text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
```

Three changes:
1. Import `BottomNav`
2. Top tab pills div: `flex` → `hidden sm:flex`
3. Main: `px-6 py-8` → `px-4 sm:px-6 py-8 pb-24 sm:pb-8`
4. Add `<BottomNav />` after `</main>`

No test needed for App itself — the BottomNav tests cover the bottom nav, and the existing nav tests (none exist for App) aren't affected.

- [ ] **Step 1: Apply changes to App.tsx**

Replace the full file with:

```tsx
import { NavLink, Outlet } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'

const TAB_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/history', label: 'History', end: false },
]

export function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-body">
      <nav className="h-14 bg-canvas border-b border-hairline flex items-center px-6">
        <span className="text-sm font-semibold tracking-tight text-ink">
          IndexApportationRecommender
        </span>
        <div className="hidden sm:flex gap-1 ml-auto">
          {TAB_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-pill text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-2 text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite — verify no regressions**

```powershell
npm run test:run
```

Expected: all previously passing tests still pass (29 + new BottomNav 3 + HistoryCardList 6 = 38 passing)

---

## Task 4: Dashboard.tsx — responsive stat grid

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx:60`

### Background

Current line 60:
```tsx
<div className="grid grid-cols-3 gap-4">
```

On mobile (375px), three stat cards at ~115px each are too cramped. Change to single column on mobile, three columns on desktop.

- [ ] **Step 1: Update the grid class**

In `frontend/src/pages/Dashboard.tsx`, find line 60 and change:

```tsx
<div className="grid grid-cols-3 gap-4">
```

to:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
```

- [ ] **Step 2: Run tests — verify no regressions**

```powershell
npm run test:run -- Dashboard
```

Expected: 4/4 PASS (existing Dashboard tests unchanged — grid class change has no effect in jsdom)

---

## Task 5: HeroCard.tsx — responsive padding and font size

**Files:**
- Modify: `frontend/src/components/HeroCard.tsx`

### Background

`HeroCard` has four render branches. All four use `p-8` (32px padding) which is too large on a 375px screen. Only the loaded branch has the large `text-5xl` amount. Both need responsive variants.

Current padding occurrences (lines 14, 27, 41, 61):
- Line 14: `rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta opacity-50 min-h-[160px] ...`
- Line 27: `rounded-xxl p-8 bg-surface-2 min-h-[160px] ...`
- Line 41: `rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta min-h-[160px] ...`
- Line 61: `rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta`

Current font size (line 68):
- Line 68: `text-white text-5xl font-semibold tracking-tight`

- [ ] **Step 1: Replace all four p-8 occurrences**

In `frontend/src/components/HeroCard.tsx`, make these four targeted replacements:

**Line 14** (loading branch):
```tsx
// before
<div className="rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta opacity-50 min-h-[160px] flex flex-col items-center justify-center">
// after
<div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta opacity-50 min-h-[160px] flex flex-col items-center justify-center">
```

**Line 27** (error branch):
```tsx
// before
<div className="rounded-xxl p-8 bg-surface-2 min-h-[160px] flex flex-col items-start gap-3">
// after
<div className="rounded-xxl p-5 sm:p-8 bg-surface-2 min-h-[160px] flex flex-col items-start gap-3">
```

**Line 41** (empty branch):
```tsx
// before
<div className="rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta min-h-[160px] flex flex-col items-center justify-center gap-4 text-center">
// after
<div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta min-h-[160px] flex flex-col items-center justify-center gap-4 text-center">
```

**Line 61** (loaded branch):
```tsx
// before
<div className="rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta">
// after
<div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta">
```

- [ ] **Step 2: Replace the font size on line 68 (loaded branch only)**

```tsx
// before
<p className="text-white text-5xl font-semibold tracking-tight">
// after
<p className="text-white text-4xl sm:text-5xl font-semibold tracking-tight">
```

- [ ] **Step 3: Run tests — verify no regressions**

```powershell
npm run test:run -- HeroCard
```

Expected: 5/5 PASS (existing HeroCard tests check content, not class names affected by responsive changes)

---

## Task 6: History.tsx — render both components, update tests

**Files:**
- Modify: `frontend/src/pages/History.tsx`
- Modify: `frontend/src/__tests__/History.test.tsx`

### Background

Current `History.tsx` renders `HistoryTable` inside a `bg-surface-1` card wrapper. After this change it renders both `HistoryCardList` (mobile, `block sm:hidden`) and `HistoryTable` (desktop, `hidden sm:block`). Since jsdom doesn't apply media queries, both components render in tests, which means values like `€620`, `1.2×`, and `—` will appear twice in the DOM. The three existing History tests that use `getByText` for these values must be updated to `getAllByText`.

- [ ] **Step 1: Update History.tsx**

Replace the full file with:

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'
import { HistoryCardList } from '../components/HistoryCardList'

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    fetchHistory().finally(() => setHasFetched(true))
  }, [])

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

      {!historyLoading && history.length > 0 && (
        <>
          <div className="block sm:hidden">
            <HistoryCardList rows={history} />
          </div>
          <div className="hidden sm:block bg-surface-1 rounded-xl p-6">
            <HistoryTable rows={history} />
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run existing History tests — observe the failures**

```powershell
npm run test:run -- History
```

Expected: 2 tests FAIL — `getByText('€620')` and `getByText('1.2×')` and `getByText('—')` each find 2 elements.

- [ ] **Step 3: Update History.test.tsx to handle both rendered components**

Replace `frontend/src/__tests__/History.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { History } from '../pages/History'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationRecord } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

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

  it('renders a row for each recommendation', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    // €620 and 1.2× appear in both HistoryCardList and HistoryTable (jsdom renders both)
    await waitFor(() => expect(screen.getAllByText('€620')[0]).toBeInTheDocument())
    expect(screen.getAllByText('1.2×')[0]).toBeInTheDocument()
  })

  it('shows — for null executed_amount', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    // — appears in both components
    await waitFor(() => expect(screen.getAllByText('—')[0]).toBeInTheDocument())
  })
})
```

- [ ] **Step 4: Run tests — verify all pass**

```powershell
npm run test:run -- History
```

Expected: 3/3 PASS

- [ ] **Step 5: Run full test suite — verify final count**

```powershell
npm run test:run
```

Expected: **38 tests passing** (29 original + 3 BottomNav + 6 HistoryCardList = 38)
