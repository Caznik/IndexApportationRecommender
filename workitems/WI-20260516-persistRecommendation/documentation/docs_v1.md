# Documentation — WI-20260516-persistRecommendation

## Implementation Summary

Added `restoreRecommendation()` Zustand action that fetches the latest history record on Dashboard mount and restores it to the store when no recommendation is loaded. HeroCard shows a "· generated [date]" label when the recommendation came from history rather than a fresh generate.

## Impacted Modules

| Module | Change |
|--------|--------|
| `frontend/src/store.ts` | New `recommendationRestoredAt` state field + `restoreRecommendation()` action; `generate()` clears restored timestamp on success |
| `frontend/src/pages/Dashboard.tsx` | Mount effect calls `restoreRecommendation()` when `recommendation === null`; passes `restoredAt` to HeroCard |
| `frontend/src/components/HeroCard.tsx` | New optional `restoredAt` prop; age label rendered in result branch badge row |

## Tests Added / Updated

| File | Change |
|------|--------|
| `frontend/src/__tests__/Dashboard.test.tsx` | +3 integration tests: restore on mount, age label, empty history empty state |
| `frontend/src/__tests__/store.test.ts` | +4 unit tests: guard, empty array, field mapping, silent failure; `recommendationRestoredAt: null` added to INITIAL; `generate` test asserts `recommendationRestoredAt` is cleared |

Total: 60 tests (was 53 before this workitem).

## Documentation Changes

- Added pattern summary: `documentation/patterns/fix-WI-20260516-persistRecommendation.md`

## How to Verify

```
cd frontend
npm run test:run   # 60 passed, 0 failed
npm run lint       # exit 0
```
