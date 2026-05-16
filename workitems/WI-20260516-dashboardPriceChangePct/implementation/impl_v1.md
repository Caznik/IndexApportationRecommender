# Implementation Summary — WI-20260516-dashboardPriceChangePct

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/utils/priceChanges.ts` | Created | Pure `computePriceChanges` utility |
| `frontend/src/__tests__/priceChanges.test.ts` | Created | 7 unit tests |
| `frontend/src/components/HeroCard.tsx` | Modified | Added `pctDay`/`pctMonth` props + `PriceBadge` helper |
| `frontend/src/__tests__/HeroCard.test.tsx` | Modified | 4 new badge tests |
| `frontend/src/pages/Dashboard.tsx` | Modified | Wired `computePriceChanges` → HeroCard |
| `frontend/src/__tests__/Dashboard.test.tsx` | Modified | 2 new integration tests |

## Key Implementation Decisions

- `computePriceChanges` is a pure function with no side effects, called inline on every render (no memoization needed — O(n) scan on daily close data)
- `PriceBadge` is module-local to `HeroCard.tsx` — not exported, not a separate file
- Props are optional (`pctDay?: number | null`) so all existing HeroCard call sites require no changes
- Zero value renders `0.0%` unsigned with muted colour — consistent with "neutral" semantics
- Both badges always render in the result branch; show `—` when data is insufficient

## Test Results

52 tests, 10 files — all pass, zero regressions.

## AC Pre-Check

- [x] AC-001: `pctDay` computed from last two `priceHistory` entries and shown as `1d` badge
- [x] AC-002: `pctMonth` computed from 30-day lookback and shown as `1m` badge
- [x] AC-003: `text-green-400` / `text-red-400` / `text-white/50` applied by `PriceBadge`
- [x] AC-004: `null` returned when history too short → `—` shown in badge
