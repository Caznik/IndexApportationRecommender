# Implementation Summary — WI-20260515-mobileMVP

**Completed:** 2026-05-15

---

## Files Created

| File | Purpose |
|------|---------|
| `frontend/src/config/navLinks.ts` | Shared nav links constant (DRY — avoids duplicate route tables in App and BottomNav) |
| `frontend/src/components/BottomNav.tsx` | Fixed bottom navigation bar, mobile-only (`sm:hidden`) |
| `frontend/src/components/HistoryCardList.tsx` | Card-per-row history list, mobile-only |
| `frontend/src/__tests__/BottomNav.test.tsx` | 4 tests: labels, active class, inactive class, root-path active |
| `frontend/src/__tests__/HistoryCardList.test.tsx` | 6 tests: card-per-row, drawdown format, null executed, formatted executed, deep drawdown color, shallow drawdown |

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Hide top pills on mobile (`hidden sm:flex`); add `pb-24 sm:pb-8` on `<main>`; render `<BottomNav />` after main |
| `frontend/src/pages/Dashboard.tsx` | Stat grid: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| `frontend/src/components/HeroCard.tsx` | All 4 branches: `p-8` → `p-5 sm:p-8`; loaded branch: `text-5xl` → `text-4xl sm:text-5xl` |
| `frontend/src/pages/History.tsx` | Dual render: `block sm:hidden` for HistoryCardList, `hidden sm:block` for HistoryTable; added `!historyError` guard |
| `frontend/src/__tests__/History.test.tsx` | `getByText` → `getAllByText(...)[0]` for values duplicated by dual render; second assertion moved inside `waitFor` |

## Test Results

```
Test Files  9 passed (9)
     Tests  39 passed (39)
```

- 29 pre-existing tests: all pass, unchanged
- 10 new tests: 4 (BottomNav) + 6 (HistoryCardList)

## Acceptance Criteria Pre-Check

- [x] AC-001: BottomNav fixed bottom bar with Dashboard/Settings/History tabs
- [x] AC-002: Active tab `border-grad-violet`; inactive tabs `border-hairline text-ink-muted`
- [x] AC-003: Top pills `hidden sm:flex`
- [x] AC-004: History dual-render with `block sm:hidden` / `hidden sm:block`
- [x] AC-005: HistoryCardList displays all 6 fields per card (date, drawdown, price, multiplier, recommended, executed)
- [x] AC-006: Dashboard stat grid `grid-cols-1 sm:grid-cols-3`
- [x] AC-007: HeroCard `p-5 sm:p-8`, loaded branch `text-4xl sm:text-5xl`
- [x] AC-008: Main `pb-24 sm:pb-8` clears fixed bottom nav
- [x] AC-009: 39/39 tests pass; 2 new test files added

## Notable Implementation Decisions

- `border-hairline` used for inactive tab border instead of `border-transparent` (spec) — functionally identical on dark background; keeps separator visible if background lightens
- `min-h-[4rem]` used instead of `h-16` — allows BottomNav to grow for iOS safe-area-inset-bottom via `pb-[env(safe-area-inset-bottom,0px)]`
- `NAV_LINKS` extracted to shared config to eliminate duplicate route table risk
