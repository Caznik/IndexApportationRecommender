# Implementation — WI-20260516-persistRecommendation

## Summary

Implemented `restoreRecommendation()` Zustand action and wired it into Dashboard on mount. Added a "· generated [date]" age label to HeroCard when the recommendation was restored from history rather than freshly generated.

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/store.ts` | Added `recommendationRestoredAt: string \| null` state, `restoreRecommendation()` action, cleared `recommendationRestoredAt` in `generate()` on success; `(set)` → `(set, get)` |
| `frontend/src/pages/Dashboard.tsx` | Added `restoreRecommendation` + `recommendationRestoredAt` subscriptions; added mount effect; passed `restoredAt` prop to HeroCard |
| `frontend/src/components/HeroCard.tsx` | Added `restoredAt?: string \| null` prop; age label span in result branch badge row |
| `frontend/src/__tests__/Dashboard.test.tsx` | Added `RecommendationRecord` import, `mockRecord` fixture, `getHistory` default mock in `beforeEach`, 3 new integration tests |
| `frontend/src/__tests__/store.test.ts` | Added `recommendationRestoredAt: null` to INITIAL, `mockResult` + `mockRecord` fixtures, 4 new unit tests for `restoreRecommendation`; added assertion to `generate` success test |

## Acceptance Criteria Pre-Check

- [x] AC-001: Dashboard mount restores last recommendation from `GET /api/history`
- [x] AC-002: Empty history → empty state shown correctly
- [x] AC-003: No blocking spinner during restore (`restoreRecommendation` has no loading state)
- [x] AC-004: All 60 tests pass (53 existing + 7 new), lint exit 0

## Test Results

```
npm run test:run  → 60 passed, 0 failed (10 test files)
npm run lint      → exit 0, zero violations
```

## Key Design Decisions

- `restoreRecommendation` has no loading/error state — restoration is silent and best-effort
- Guard `if (get().recommendation !== null) return` prevents overwriting in-flight or existing recommendations
- `generate()` clears `recommendationRestoredAt: null` so the age label disappears on fresh results
- `market_price → current_price` is the only field rename in the `RecommendationRecord` → `RecommendationResult` mapping
