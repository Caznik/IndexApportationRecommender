# Persist Recommendation State — Design Spec

**Workitem:** WI-20260516-persistRecommendation  
**Date:** 2026-05-16  
**Feature type:** fix

---

## Goal

Restore the last recommendation from the history API on Dashboard mount so that a page refresh does not lose the previously generated result. When restored, show a subtle age label so the user knows the data may be stale.

## Problem Statement

The Zustand store is in-memory only. Refreshing the page resets `recommendation` to `null`, showing the empty state even when a recommendation exists in the database. The history API (`GET /api/history`) already returns all past recommendations sorted newest-first — it can be used to restore state without any backend changes.

---

## Architecture

### Approach

New `restoreRecommendation()` action in the Zustand store, called from `Dashboard.tsx` on mount when `recommendation === null`. This follows the same pattern as `fetchSettings`. No backend changes required.

### Type mapping

`GET /api/history` returns `RecommendationRecord[]`. The frontend store holds `RecommendationResult`. The only field rename is `market_price → current_price`; all other fields are identical.

```typescript
// RecommendationRecord (API)    → RecommendationResult (store)
market_price                      → current_price
drawdown                          → drawdown
drawdown_pct                      → drawdown_pct
multiplier                        → multiplier
recommended_amount                → recommended_amount
rule_triggered                    → rule_triggered
explanation                       → explanation
```

---

## Component Changes

### `frontend/src/store.ts`

**New state field:**
```typescript
recommendationRestoredAt: string | null   // created_at from history[0]; null when freshly generated
```

**New action:**
```typescript
restoreRecommendation: async () => {
  // Guard: do nothing if recommendation already set
  // Call api.getHistory()
  // If history is empty: return (no-op)
  // Map history[0] to RecommendationResult (market_price → current_price)
  // set({ recommendation, recommendationRestoredAt: history[0].created_at })
  // On error: silent fail — restoration is best-effort, no error state
}
```

**Modified action** — `generate()` clears `recommendationRestoredAt` when a fresh result lands:
```typescript
set({ recommendation, recommendationLoading: false, recommendationRestoredAt: null })
```

No loading or error state for `restoreRecommendation` — restoration is silent and non-blocking.

### `frontend/src/pages/Dashboard.tsx`

Add `restoreRecommendation` and `recommendationRestoredAt` from the store. Add a mount effect:

```typescript
useEffect(() => {
  if (!recommendation) restoreRecommendation()
}, [recommendation, restoreRecommendation])
```

Pass `recommendationRestoredAt` to `HeroCard` as new prop `restoredAt`.

### `frontend/src/components/HeroCard.tsx`

New optional prop:
```typescript
restoredAt?: string | null
```

In the result branch badge row, append the age label when `restoredAt` is set:

```tsx
{restoredAt && (
  <span className="text-white/40 text-xs">
    · generated {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(restoredAt))}
  </span>
)}
```

Styled identically to the existing `· market data unavailable` indicator. Label disappears automatically when `generate()` is called (sets `recommendationRestoredAt: null`).

---

## Error Handling

- **Empty history:** `restoreRecommendation` returns early — empty state shown as normal.
- **API failure:** Silent catch — empty state shown, no error displayed to user. Restoration is best-effort; the user can always click Generate.
- **Race condition (generate called before restore completes):** The guard `if (recommendation !== null) return` at the start of `restoreRecommendation` prevents overwriting a freshly generated result.

---

## Testing

Three new tests in `frontend/src/__tests__/Dashboard.test.tsx`:

1. **Restores recommendation on mount from history** — `mockApi.getHistory.mockResolvedValue([mockRecord])` → `screen.getByText('€620')` appears without clicking Generate.
2. **Shows age label when restored** — same setup → `screen.getByText(/generated may/i)` appears.
3. **Empty history → empty state remains** — `mockApi.getHistory.mockResolvedValue([])` → `screen.getByText('No recommendation yet')` still shown.

`mockRecord` shape (`RecommendationRecord`):
```typescript
const mockRecord: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-14T10:00:00',
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

---

## Out of Scope

- Backend changes — history API already exists and is sufficient
- Showing the age label on freshly generated recommendations (`created_at` not in `RecommendationResult`)
- Polling or real-time sync of the recommendation
