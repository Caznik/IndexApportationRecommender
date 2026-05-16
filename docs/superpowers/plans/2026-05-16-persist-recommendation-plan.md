# Persist Recommendation State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the last recommendation from the history API on Dashboard mount so a page refresh does not lose the previously generated result, with a subtle age label indicating the data is from a prior session.

**Architecture:** New `restoreRecommendation()` Zustand action calls `GET /api/history`, maps `history[0]` (newest-first) to `RecommendationResult` (`market_price → current_price`), and stores both the result and its `created_at` timestamp. Dashboard calls this action on mount when `recommendation === null`. HeroCard renders a "· generated [date]" label when `recommendationRestoredAt` is set. The label disappears on fresh generate. No backend changes.

**Tech Stack:** Zustand (state), React 19 `useEffect`, `Intl.DateTimeFormat`, Vitest + React Testing Library.

---

## File Structure

| File | Change |
|------|--------|
| `frontend/src/store.ts` | Add `recommendationRestoredAt` state + `restoreRecommendation` action; modify `generate()` to clear restored timestamp; change `(set)` → `(set, get)` |
| `frontend/src/pages/Dashboard.tsx` | Subscribe to `restoreRecommendation` + `recommendationRestoredAt`; add mount effect; pass `restoredAt` to HeroCard |
| `frontend/src/components/HeroCard.tsx` | Add optional `restoredAt` prop; render age label in result branch badge row |
| `frontend/src/__tests__/Dashboard.test.tsx` | Add `RecommendationRecord` import + `mockRecord`; add `getHistory` default mock to `beforeEach`; add `recommendationRestoredAt: null` to state reset; add 3 new tests |

---

### Task 1: Write failing tests (RED)

**Files:**
- Modify: `frontend/src/__tests__/Dashboard.test.tsx`

- [ ] **Step 1: Add `RecommendationRecord` to the import and add `mockRecord` constant**

In `frontend/src/__tests__/Dashboard.test.tsx`, change line 7 from:

```typescript
import type { RecommendationResult, Settings } from '../api'
```

to:

```typescript
import type { RecommendationResult, Settings, RecommendationRecord } from '../api'
```

Then add `mockRecord` after `mockResult` (after line 25):

```typescript
const mockRecord: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-14T12:00:00',
  ticker: 'URTH',
  market_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 620,
  executed_amount: null,
  explanation: '',
}
```

- [ ] **Step 2: Update `beforeEach` to reset `recommendationRestoredAt` and default-mock `getHistory`**

Replace the entire `beforeEach` block (lines 27–43) with:

```typescript
beforeEach(() => {
  // Reset real store state before each test
  useStore.setState({
    recommendation: null,
    recommendationRestoredAt: null,
    recommendationLoading: false,
    recommendationError: null,
    settings: mockSettings,
    settingsLoading: false,
    settingsError: null,
    history: [],
    historyLoading: false,
    historyError: null,
  })
  vi.clearAllMocks()
  mockApi.getPriceHistory.mockResolvedValue([])
  mockApi.getSettings.mockResolvedValue(mockSettings)
  mockApi.getHistory.mockResolvedValue([])
})
```

Note: `recommendationRestoredAt` must be in the reset even before the store has the field — Zustand's `setState` silently ignores unknown keys, so this is safe and will work correctly once the store field is added in Task 2.

- [ ] **Step 3: Add 3 new tests inside the `describe('Dashboard', ...)` block**

Add these three tests after the last existing test (after line 108, before the closing `}`):

```typescript
  it('restores recommendation on mount when history exists', async () => {
    mockApi.getHistory.mockResolvedValue([mockRecord])
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByText('€620')).toBeInTheDocument())
  })

  it('shows age label when recommendation is restored from history', async () => {
    mockApi.getHistory.mockResolvedValue([mockRecord])
    render(<Dashboard />)
    await waitFor(() => expect(screen.getByText(/generated may/i)).toBeInTheDocument())
  })

  it('shows empty state when history is empty on mount', async () => {
    mockApi.getHistory.mockResolvedValue([])
    render(<Dashboard />)
    await waitFor(() =>
      expect(screen.getByText('No recommendation yet')).toBeInTheDocument()
    )
  })
```

- [ ] **Step 4: Run tests and verify RED**

Run from `frontend/`:

```
npm run test:run
```

Expected: 2 of the 3 new tests fail — "restores recommendation on mount" and "shows age label". The "empty state" test passes because recommendation starts as null. Total: 2 failures. Existing 53 tests continue to pass.

If existing tests break (not just the 2 new ones), there is a problem with the `beforeEach` changes — investigate before continuing.

---

### Task 2: Implement store action, wire Dashboard, add HeroCard age label (GREEN)

**Files:**
- Modify: `frontend/src/store.ts`
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/components/HeroCard.tsx`

#### store.ts

- [ ] **Step 1: Add `recommendationRestoredAt` and `restoreRecommendation` to the State interface**

In `frontend/src/store.ts`, replace the State interface (lines 5–21) with:

```typescript
interface State {
  recommendation: RecommendationResult | null
  recommendationRestoredAt: string | null
  recommendationLoading: boolean
  recommendationError: string | null
  generate: () => Promise<void>
  restoreRecommendation: () => Promise<void>

  settings: Settings | null
  settingsLoading: boolean
  settingsError: string | null
  fetchSettings: () => Promise<void>
  saveSettings: (update: SettingsUpdate) => Promise<void>

  history: RecommendationRecord[]
  historyLoading: boolean
  historyError: string | null
  fetchHistory: () => Promise<void>
}
```

- [ ] **Step 2: Replace the entire `create` call with the updated implementation**

Replace everything from line 23 to the end of the file with:

```typescript
export const useStore = create<State>((set, get) => ({
  recommendation: null,
  recommendationRestoredAt: null,
  recommendationLoading: false,
  recommendationError: null,
  generate: async () => {
    set({ recommendationLoading: true, recommendationError: null })
    try {
      const recommendation = await api.generateRecommendation()
      set({ recommendation, recommendationLoading: false, recommendationRestoredAt: null })
    } catch (e) {
      set({ recommendationLoading: false, recommendationError: (e as Error).message })
    }
  },
  restoreRecommendation: async () => {
    if (get().recommendation !== null) return
    try {
      const history = await api.getHistory()
      if (history.length === 0) return
      const latest = history[0]
      set({
        recommendation: {
          current_price: latest.market_price,
          drawdown: latest.drawdown,
          drawdown_pct: latest.drawdown_pct,
          multiplier: latest.multiplier,
          recommended_amount: latest.recommended_amount,
          rule_triggered: latest.rule_triggered,
          explanation: latest.explanation,
        },
        recommendationRestoredAt: latest.created_at,
      })
    } catch {
      // silent — restoration is best-effort; user can always click Generate
    }
  },

  settings: null,
  settingsLoading: false,
  settingsError: null,
  fetchSettings: async () => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await api.getSettings()
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
    }
  },
  saveSettings: async (update: SettingsUpdate) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await api.saveSettings(update)
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
    }
  },

  history: [],
  historyLoading: false,
  historyError: null,
  fetchHistory: async () => {
    set({ historyLoading: true, historyError: null })
    try {
      const history = await api.getHistory()
      set({ history, historyLoading: false })
    } catch (e) {
      set({ historyLoading: false, historyError: (e as Error).message })
    }
  },
}))
```

Key changes vs the original:
- `(set)` → `(set, get)` — needed for the guard in `restoreRecommendation`
- `recommendationRestoredAt: null` added to initial state
- `generate()` now also sets `recommendationRestoredAt: null` on success
- New `restoreRecommendation` action added after `generate`

#### Dashboard.tsx

- [ ] **Step 3: Subscribe to the two new store values and add the restore effect**

In `frontend/src/pages/Dashboard.tsx`, after line 16 (`const fetchSettings = useStore((s) => s.fetchSettings)`), add:

```typescript
  const restoreRecommendation = useStore((s) => s.restoreRecommendation)
  const recommendationRestoredAt = useStore((s) => s.recommendationRestoredAt)
```

Then after the existing `fetchSettings` effect (after line 24 `}, [settings, fetchSettings])`), add the new restore effect:

```typescript
  useEffect(() => {
    if (!recommendation) restoreRecommendation()
  }, [recommendation, restoreRecommendation])
```

- [ ] **Step 4: Pass `restoredAt` to HeroCard**

In the same file, find the `<HeroCard` JSX block (lines 56–65) and add `restoredAt={recommendationRestoredAt}` as a new prop. The full HeroCard call becomes:

```tsx
      <HeroCard
        result={recommendation}
        baseAmount={settings ? Number(settings.base_amount) : null}
        loading={recommendationLoading}
        error={recommendationError}
        onGenerate={generate}
        pctDay={pctDay}
        pctMonth={pctMonth}
        priceHistoryError={priceHistoryError}
        restoredAt={recommendationRestoredAt}
      />
```

#### HeroCard.tsx

- [ ] **Step 5: Add `restoredAt` prop to the Props interface and function signature**

In `frontend/src/components/HeroCard.tsx`, replace the Props interface (lines 3–12) with:

```typescript
interface Props {
  result: RecommendationResult | null
  baseAmount: number | null
  loading: boolean
  error: string | null
  onGenerate: () => void
  pctDay?: number | null
  pctMonth?: number | null
  priceHistoryError?: boolean
  restoredAt?: string | null
}
```

Replace the function signature on line 36 with:

```typescript
export function HeroCard({ result, baseAmount, loading, error, onGenerate, pctDay, pctMonth, priceHistoryError, restoredAt }: Props) {
```

- [ ] **Step 6: Add the age label to the badge row in the result branch**

Find the badge row `<div>` in the result branch (lines 100–106):

```tsx
          <div className="flex items-center gap-2 mt-2">
            <PriceBadge label="1d" pct={pctDay} />
            <PriceBadge label="1m" pct={pctMonth} />
            {priceHistoryError && (
              <span className="text-white/40 text-xs">· market data unavailable</span>
            )}
          </div>
```

Replace it with:

```tsx
          <div className="flex items-center gap-2 mt-2">
            <PriceBadge label="1d" pct={pctDay} />
            <PriceBadge label="1m" pct={pctMonth} />
            {priceHistoryError && (
              <span className="text-white/40 text-xs">· market data unavailable</span>
            )}
            {restoredAt && (
              <span className="text-white/40 text-xs">
                · generated {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(restoredAt))}
              </span>
            )}
          </div>
```

- [ ] **Step 7: Run the full test suite to verify GREEN**

Run from `frontend/`:

```
npm run test:run
```

Expected: all 56 tests pass (53 existing + 3 new), 0 failures. If any test fails, read the failure output carefully:

- If "restores recommendation on mount" fails: verify `restoreRecommendation` is called in the Dashboard `useEffect` and the dependency array is correct.
- If "shows age label" fails: verify `restoredAt` is passed from Dashboard to HeroCard and the JSX condition renders correctly.
- If an existing test fails: check whether the new `restoreRecommendation` call in the mount effect conflicts with any test that doesn't mock `getHistory` — it should be covered by `beforeEach`'s `mockApi.getHistory.mockResolvedValue([])`.

- [ ] **Step 8: Run the linter**

Run from `frontend/`:

```
npm run lint
```

Expected: exit 0, zero violations. The new `useEffect` dep array `[recommendation, restoreRecommendation]` satisfies `exhaustive-deps`.
