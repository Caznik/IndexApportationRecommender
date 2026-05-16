# Documentation — WI-20260516-dashboardPriceChangePct

## Summary

Added two color-coded price-change pill badges (`1d` / `1m`) to the HeroCard on the Dashboard. They show how the fund price has moved since the previous trading day and since ~30 calendar days ago, computed from the already-fetched price history.

## Impacted Modules

| Module | Change |
|--------|--------|
| `frontend/src/utils/priceChanges.ts` | New pure utility — `computePriceChanges` |
| `frontend/src/components/HeroCard.tsx` | New optional props + `PriceBadge` local helper |
| `frontend/src/pages/Dashboard.tsx` | Calls utility; passes values to HeroCard |

## Tests Added / Updated

| File | Delta |
|------|-------|
| `frontend/src/__tests__/priceChanges.test.ts` | +7 unit tests (new file) |
| `frontend/src/__tests__/HeroCard.test.tsx` | +4 badge tests |
| `frontend/src/__tests__/Dashboard.test.tsx` | +2 integration tests |

**Total:** 52 tests passing (was 45 before this workitem).

## Architectural Notes

- `computePriceChanges` is a pure function. No memoization needed — cheap O(n) scan on daily close data.
- `PriceBadge` is module-local to `HeroCard.tsx`. Not a shared component — kept co-located with its only consumer.
- Optional props (`pctDay?`, `pctMonth?`) keep all existing HeroCard call sites unchanged.
- Zero change renders `0.0%` unsigned with neutral (muted) colour — deliberate UX distinction from positive.
- Badges show `—` when history is too short (< 2 entries, or no 30-day-old entry found). No spinner needed.

## Design Spec

`docs/superpowers/specs/2026-05-16-dashboard-price-change-pct-design.md`

## Implementation Plan

`docs/superpowers/plans/2026-05-16-dashboard-price-change-pct.md`
