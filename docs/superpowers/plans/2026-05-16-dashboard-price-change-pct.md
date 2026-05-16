# Dashboard Price Change Percentages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two color-coded pill badges inside the HeroCard showing % price change vs yesterday and vs last month, computed from already-fetched price history data.

**Architecture:** A pure helper function `computePriceChanges` derives both percentages from the `priceHistory` array in `Dashboard.tsx`. The values are passed as optional props into `HeroCard`, which renders small pill badges inside the existing result branch. No backend changes needed.

**Tech Stack:** React 19, TypeScript, Vitest + @testing-library/react, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/utils/priceChanges.ts` | **Create** | Pure function: `computePriceChanges(history) → { pctDay, pctMonth }` |
| `frontend/src/__tests__/priceChanges.test.ts` | **Create** | Unit tests for `computePriceChanges` |
| `frontend/src/components/HeroCard.tsx` | **Modify** | Accept `pctDay?` / `pctMonth?` props; render `PriceBadge` in result branch |
| `frontend/src/__tests__/HeroCard.test.tsx` | **Modify** | Tests for badge rendering (values, colors, null fallback) |
| `frontend/src/pages/Dashboard.tsx` | **Modify** | Call `computePriceChanges(priceHistory)`; pass results to `<HeroCard>` |
| `frontend/src/__tests__/Dashboard.test.tsx` | **Modify** | Integration test: badges appear when priceHistory has data |

---

### Task 1: `computePriceChanges` utility (TDD)

**Files:**
- Create: `frontend/src/utils/priceChanges.ts`
- Create: `frontend/src/__tests__/priceChanges.test.ts`

- [ ] **Step 1.1 — Write the failing tests**

Create `frontend/src/__tests__/priceChanges.test.ts` with this content:

```typescript
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
      ['2026-04-16', 220],  // exactly 30 days before last — used as monthAgo
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
})
```

- [ ] **Step 1.2 — Run tests to verify they fail**

```bash
cd frontend && npm run test:run -- src/__tests__/priceChanges.test.ts
```

Expected: FAIL — `Cannot find module '../utils/priceChanges'`

- [ ] **Step 1.3 — Implement `computePriceChanges`**

Create `frontend/src/utils/priceChanges.ts`:

```typescript
import type { PricePoint } from '../api'

export interface PriceChanges {
  pctDay: number | null
  pctMonth: number | null
}

export function computePriceChanges(history: PricePoint[]): PriceChanges {
  if (history.length < 2) return { pctDay: null, pctMonth: null }

  const last = history[history.length - 1]
  const prev = history[history.length - 2]
  const pctDay = (last.close_price - prev.close_price) / prev.close_price

  const lastDate = new Date(last.date)
  const cutoff = new Date(lastDate)
  cutoff.setDate(cutoff.getDate() - 30)

  let monthAgo: PricePoint | null = null
  for (let i = history.length - 2; i >= 0; i--) {
    if (new Date(history[i].date) <= cutoff) {
      monthAgo = history[i]
      break
    }
  }

  return {
    pctDay,
    pctMonth: monthAgo
      ? (last.close_price - monthAgo.close_price) / monthAgo.close_price
      : null,
  }
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```bash
cd frontend && npm run test:run -- src/__tests__/priceChanges.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 1.5 — Commit**

```bash
git add frontend/src/utils/priceChanges.ts frontend/src/__tests__/priceChanges.test.ts
git commit -m "feat: add computePriceChanges utility for day/month price deltas"
```

---

### Task 2: HeroCard badge rendering (TDD)

**Files:**
- Modify: `frontend/src/components/HeroCard.tsx`
- Modify: `frontend/src/__tests__/HeroCard.test.tsx`

- [ ] **Step 2.1 — Write failing badge tests**

Append these tests inside the existing `describe('HeroCard', ...)` block in `frontend/src/__tests__/HeroCard.test.tsx`:

```typescript
  it('shows positive day change badge in green', () => {
    render(
      <HeroCard
        result={mockResult}
        baseAmount={500}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={0.014}
        pctMonth={-0.032}
      />
    )
    expect(screen.getByText('+1.4%')).toBeInTheDocument()
    expect(screen.getByText('-3.2%')).toBeInTheDocument()
  })

  it('shows dash placeholder for null price change values', () => {
    render(
      <HeroCard
        result={mockResult}
        baseAmount={500}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={null}
        pctMonth={null}
      />
    )
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render badges when result is null', () => {
    render(
      <HeroCard
        result={null}
        baseAmount={null}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={0.014}
        pctMonth={0.05}
      />
    )
    expect(screen.queryByText('+1.4%')).not.toBeInTheDocument()
    expect(screen.queryByText('+5.0%')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2.2 — Run tests to verify they fail**

```bash
cd frontend && npm run test:run -- src/__tests__/HeroCard.test.tsx
```

Expected: 3 new tests FAIL (badges not rendered yet), 5 existing tests PASS

- [ ] **Step 2.3 — Update HeroCard with badge support**

Replace the entire contents of `frontend/src/components/HeroCard.tsx` with:

```typescript
import type { RecommendationResult } from '../api'

interface Props {
  result: RecommendationResult | null
  baseAmount: number | null
  loading: boolean
  error: string | null
  onGenerate: () => void
  pctDay?: number | null
  pctMonth?: number | null
}

function PriceBadge({ label, pct }: { label: string; pct: number | null | undefined }) {
  const value = pct ?? null
  const color =
    value === null || value === 0
      ? 'text-white/50'
      : value > 0
      ? 'text-green-400'
      : 'text-red-400'
  const text =
    value === null
      ? '—'
      : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
  return (
    <span className="bg-white/10 rounded-full px-2.5 py-1 text-xs font-medium">
      <span className="text-white/60">{label} </span>
      <span className={color}>{text}</span>
    </span>
  )
}

export function HeroCard({ result, baseAmount, loading, error, onGenerate, pctDay, pctMonth }: Props) {
  if (loading) {
    return (
      <div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta opacity-50 min-h-[160px] flex flex-col items-center justify-center">
        <button
          disabled
          className="bg-white text-black rounded-pill px-5 py-2.5 text-sm font-medium opacity-50 cursor-not-allowed"
        >
          Generating…
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xxl p-5 sm:p-8 bg-surface-2 min-h-[160px] flex flex-col items-start gap-3">
        <p className="text-ink-muted text-sm">{error}</p>
        <button
          onClick={onGenerate}
          className="bg-surface-1 text-ink rounded-pill px-4 py-2 text-sm font-medium hover:bg-hairline transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta min-h-[160px] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-white/80 text-base">No recommendation yet</p>
        <button
          onClick={onGenerate}
          className="bg-white text-black rounded-pill px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Generate Recommendation
        </button>
      </div>
    )
  }

  const diff = baseAmount !== null ? Number(result.recommended_amount) - baseAmount : null
  const diffStr =
    diff !== null
      ? `${diff >= 0 ? '+' : '-'}€${Math.abs(diff).toFixed(0)}`
      : null
  const drawdownStr = `${(Number(result.drawdown_pct) * 100).toFixed(1)}%`

  return (
    <div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">
            Recommended contribution
          </p>
          <p className="text-white text-4xl sm:text-5xl font-semibold tracking-tight">
            €{Number(result.recommended_amount).toFixed(0)}
          </p>
          <p className="text-white/70 text-sm mt-2">
            {diffStr && `${diffStr} vs base · `}
            {Number(result.multiplier).toFixed(1)}× · {drawdownStr} drawdown ·{' '}
            <span className="text-white/90">{result.rule_triggered}</span>
          </p>
          <div className="flex gap-2 mt-2">
            <PriceBadge label="1d" pct={pctDay} />
            <PriceBadge label="1m" pct={pctMonth} />
          </div>
        </div>
        <button
          onClick={onGenerate}
          className="shrink-0 bg-white/10 text-white rounded-xxl px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.4 — Run tests to verify all pass**

```bash
cd frontend && npm run test:run -- src/__tests__/HeroCard.test.tsx
```

Expected: 8 tests PASS (5 existing + 3 new)

- [ ] **Step 2.5 — Commit**

```bash
git add frontend/src/components/HeroCard.tsx frontend/src/__tests__/HeroCard.test.tsx
git commit -m "feat: render 1d/1m price change pill badges in HeroCard"
```

---

### Task 3: Wire Dashboard.tsx

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/__tests__/Dashboard.test.tsx`

- [ ] **Step 3.1 — Write a failing integration test**

Append inside the existing `describe('Dashboard', ...)` block in `frontend/src/__tests__/Dashboard.test.tsx`:

```typescript
  it('displays day price change badge when priceHistory has multiple entries', async () => {
    mockApi.getPriceHistory.mockResolvedValue([
      { date: '2026-05-15', close_price: 100 },
      { date: '2026-05-16', close_price: 102 },
    ])
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() => {
      expect(screen.getByText('€620')).toBeInTheDocument()
      expect(screen.getByText('+2.0%')).toBeInTheDocument()
    })
  })
```

- [ ] **Step 3.2 — Run test to verify it fails**

```bash
cd frontend && npm run test:run -- src/__tests__/Dashboard.test.tsx
```

Expected: 1 new test FAILS (`+2.0%` not in document), 4 existing tests PASS

- [ ] **Step 3.3 — Update Dashboard.tsx**

Replace the entire contents of `frontend/src/pages/Dashboard.tsx` with:

```typescript
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getPriceHistory } from '../api'
import type { PricePoint } from '../api'
import { HeroCard } from '../components/HeroCard'
import { StatCard } from '../components/StatCard'
import { PriceChart } from '../components/PriceChart'
import { computePriceChanges } from '../utils/priceChanges'

export function Dashboard() {
  const recommendation = useStore((s) => s.recommendation)
  const recommendationLoading = useStore((s) => s.recommendationLoading)
  const recommendationError = useStore((s) => s.recommendationError)
  const generate = useStore((s) => s.generate)
  const settings = useStore((s) => s.settings)
  const fetchSettings = useStore((s) => s.fetchSettings)

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    if (!settings) fetchSettings()
  }, [])

  useEffect(() => {
    setChartLoading(true)
    getPriceHistory()
      .then(setPriceHistory)
      .catch(() => {})
      .finally(() => setChartLoading(false))
  }, [])

  const { pctDay, pctMonth } = computePriceChanges(priceHistory)

  const statCards = [
    {
      label: 'Current Price',
      value: recommendation ? `$${Number(recommendation.current_price).toFixed(2)}` : null,
    },
    {
      label: '12m High',
      value:
        recommendation && settings
          ? `$${(Number(recommendation.current_price) / (1 + Number(recommendation.drawdown_pct))).toFixed(2)}`
          : null,
    },
    {
      label: 'Base Amount',
      value: settings ? `€${Number(settings.base_amount).toFixed(0)}` : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <HeroCard
        result={recommendation}
        baseAmount={settings ? Number(settings.base_amount) : null}
        loading={recommendationLoading}
        error={recommendationError}
        onGenerate={generate}
        pctDay={pctDay}
        pctMonth={pctMonth}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <PriceChart data={priceHistory} loading={chartLoading} />
    </div>
  )
}
```

- [ ] **Step 3.4 — Run all tests to verify they pass**

```bash
cd frontend && npm run test:run
```

Expected: All tests PASS (priceChanges: 6, HeroCard: 8, Dashboard: 5, others unchanged)

- [ ] **Step 3.5 — Commit**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/__tests__/Dashboard.test.tsx
git commit -m "feat: wire price change percentages through Dashboard to HeroCard"
```
