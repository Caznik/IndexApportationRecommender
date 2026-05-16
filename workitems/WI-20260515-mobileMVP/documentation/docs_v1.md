# Documentation — WI-20260515-mobileMVP

**Date:** 2026-05-15

---

## What Was Built

Mobile-responsive layout polish for the IndexApportationRecommender SPA. The existing React/Vite/TypeScript frontend (Dashboard, Settings, History) now works correctly on phone-sized screens (minimum 375px viewport) without any change to the desktop experience.

**Approach:** Hybrid — new components where mobile structure differs fundamentally from desktop; Tailwind `sm:` responsive prefixes for all other cosmetic/spacing adjustments. The `sm:` breakpoint (640px) is the single mobile/desktop boundary throughout.

---

## Impacted Modules

### New Files

| File | Description |
|------|-------------|
| `frontend/src/config/navLinks.ts` | Shared nav links array (`NAV_LINKS`) used by both `App.tsx` and `BottomNav.tsx` |
| `frontend/src/components/BottomNav.tsx` | Fixed bottom navigation bar, visible only on mobile (`sm:hidden`) |
| `frontend/src/components/HistoryCardList.tsx` | Card-per-row history list, visible only on mobile |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Top pills `hidden sm:flex`; main `pb-24 sm:pb-8`; `<BottomNav />` rendered after `<main>` |
| `frontend/src/pages/Dashboard.tsx` | Stat grid `grid-cols-1 sm:grid-cols-3` |
| `frontend/src/components/HeroCard.tsx` | Padding `p-5 sm:p-8` and font `text-4xl sm:text-5xl` across all 4 render branches |
| `frontend/src/pages/History.tsx` | Dual-render: `HistoryCardList` (`block sm:hidden`) + `HistoryTable` (`hidden sm:block`); `!historyError` added to data guard |

### Unchanged Files

`Settings.tsx`, `HistoryTable.tsx`, `StatCard.tsx`, `PriceChart.tsx`, `store.ts`, `api.ts`, `vite.config.ts`, `tailwind.config.ts` — no modifications required.

---

## Tests Added / Updated

| File | Change | Tests |
|------|--------|-------|
| `src/__tests__/BottomNav.test.tsx` | New | 4 — labels, active class, inactive class, root-path active |
| `src/__tests__/HistoryCardList.test.tsx` | New | 6 — card render, drawdown format, null executed, formatted executed, deep drawdown color, shallow |
| `src/__tests__/History.test.tsx` | Updated | 3 (unchanged count) — `getAllByText(...)[0]` for dual-render; second assertion inside `waitFor` |

Total: 39 tests passing (29 pre-existing + 10 new).

---

## Architecture Notes

**`sm:` as the single breakpoint:** All mobile/desktop toggling uses `sm:` (640px). No `md:`, `lg:`, or custom breakpoints introduced.

**CSS-only toggling for dual-render:** `HistoryCardList` and `HistoryTable` both render in the DOM; visibility is controlled purely via `block sm:hidden` / `hidden sm:block`. This pattern is intentional — jsdom tests see both, which is why `History.test.tsx` uses `getAllByText(...)[0]`.

**iOS safe area:** `BottomNav` uses `min-h-[4rem]` + `pb-[env(safe-area-inset-bottom,0px)]` so the nav bar grows to clear the home indicator on notched iPhones rather than clipping content.

**Shared nav config:** `NAV_LINKS` in `frontend/src/config/navLinks.ts` is the single source of truth for route/label definitions. Any future tab additions must be made there only.

---

## Known Deviations from Spec

- Inactive BottomNav tab border: `border-hairline` used instead of spec's `border-transparent`. Visually identical on dark canvas; keeps separator if background changes. Not a functional deviation.
- BottomNav height: `min-h-[4rem]` instead of spec's `h-16`. Functionally superior (iOS safe area); same size on standard devices.
