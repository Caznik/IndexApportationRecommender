# UI Patterns — WI-20260514-frontendMVP

Patterns established during the frontend MVP implementation. Reference when building additional frontend views.

---

## Real Store + Mocked API Component Tests

**Pattern:** Component tests use the real Zustand store with `useStore.setState()` for isolation, and mock only the API module.

```ts
vi.mock('../api')
const mockApi = vi.mocked(api)

beforeEach(() => {
  useStore.setState({ recommendation: null, recommendationLoading: false, ... })
  vi.clearAllMocks()
  mockApi.getPriceHistory.mockResolvedValue([])
})
```

**Why:** Zustand selector calls (`useStore((s) => s.field)`) return a live slice of the store. Mocking the store with `vi.mock('../store') + mockReturnValue(state)` would return the full state object for any selector call rather than the selected field — breaking all selector usage.

---

## Zustand Selector Pattern

**Pattern:** Always access store state via individual selectors, never via naked `useStore()`.

```tsx
// ✅ correct — stable reference, avoids unnecessary re-renders
const recommendation = useStore((s) => s.recommendation)
const generate = useStore((s) => s.generate)

// ❌ incorrect — subscribes to entire store
const { recommendation, generate } = useStore()
```

---

## Flat Slice State

**Pattern:** All Zustand state lives in a single flat `State` interface with namespaced fields.

```ts
interface State {
  recommendation: RecommendationResult | null
  recommendationLoading: boolean
  recommendationError: string | null
  generate: () => Promise<void>
  // ...settings fields, history fields
}
```

**Why:** Zustand's `combine` pattern adds complexity for no benefit at this scale. Flat state with namespaced fields (`recommendationLoading` vs `loading`) is readable and avoids nested access.

---

## Async Slice Action Pattern

**Pattern:** Every async store action follows the same three-phase structure.

```ts
generate: async () => {
  set({ recommendationLoading: true, recommendationError: null })  // phase 1: start
  try {
    const recommendation = await api.generateRecommendation()
    set({ recommendation, recommendationLoading: false })          // phase 2: success
  } catch (e) {
    set({ recommendationLoading: false, recommendationError: (e as Error).message })  // phase 3: error
  }
},
```

**Note:** Error does NOT reset existing data. The previous result stays visible while the error message is shown.

---

## decimal `drawdown_pct` Convention

**Pattern:** `drawdown_pct` from the backend is a decimal proportion. Always multiply by 100 for display.

```ts
const drawdownStr = `${(Number(result.drawdown_pct) * 100).toFixed(1)}%`
// -0.082 → "-8.2%"
```

This applies in: `HeroCard.tsx`, `HistoryTable.tsx`, and the 12m High formula in `Dashboard.tsx`.

---

## 12m High Derivation

**Pattern:** The 12-month high is derived from `current_price` and `drawdown_pct` (not stored separately).

```ts
const high = Number(recommendation.current_price) / (1 + Number(recommendation.drawdown_pct))
```

Use `drawdown_pct` (decimal proportion), not `drawdown` (which may be an absolute dollar value).

---

## `hasFetched` Guard for Empty States

**Pattern:** For pages that fetch on mount, guard empty-state UI with a `hasFetched` flag to prevent flashing before the first request starts.

```tsx
const [hasFetched, setHasFetched] = useState(false)

useEffect(() => {
  fetchHistory().finally(() => setHasFetched(true))
}, [])

{hasFetched && !historyLoading && !historyError && history.length === 0 && (
  <EmptyState />
)}
```

---

## Post-Save Success Guarded by Error Check

**Pattern:** Show a success banner only when no store error was set by the action.

```ts
await saveSettings(update)
if (!useStore.getState().settingsError) {
  setSaveSuccess(true)
}
```

**Why:** Store actions catch errors internally and don't re-throw. Checking store state after await is the correct way to detect failure.
