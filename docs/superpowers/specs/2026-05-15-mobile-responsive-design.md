# Mobile-Responsive Web Design Spec

**Date:** 2026-05-15
**Workitem:** WI-20260515-mobileMVP
**Status:** Approved

---

## Goal

Make the existing React/Vite/TypeScript SPA fully usable on phone-sized screens (minimum 375px viewport width) without changing the desktop experience. No React Native, no PWA features — responsive layout polish only.

## Architecture

Approach: **hybrid**. New components where mobile structure differs fundamentally from desktop (`BottomNav`, `HistoryCardList`); Tailwind responsive prefixes (`sm:`) for all other cosmetic/spacing adjustments. The `sm:` breakpoint (640px) is the single mobile/desktop boundary used throughout.

No new API calls, no store changes, no backend changes.

---

## New Components

### `frontend/src/components/BottomNav.tsx`

Fixed bottom navigation bar shown only on mobile (`sm:hidden`). Replaces the top tab pills on narrow screens.

**Structure:**
- `<nav>` fixed to bottom, full width, `h-16 bg-canvas border-t border-hairline z-50 sm:hidden`
- Three `<NavLink>` tabs evenly distributed (`justify-around`)
- Each tab: text label centered, `text-xs font-medium`
- Active state: `text-ink` + `border-t-2 border-grad-violet` (2px violet top accent)
- Inactive state: `text-ink-muted border-t-2 border-transparent` (transparent border keeps all tabs the same height)

**Tabs:** Dashboard (`/`, `end`), Settings (`/settings`), History (`/history`) — same config as top nav.

---

### `frontend/src/components/HistoryCardList.tsx`

Card-per-row list for mobile. Shown below `sm:` breakpoint; `HistoryTable` shown above.

**Props:** `rows: RecommendationRecord[]` (same as `HistoryTable`)

**Card layout per row:**
```
┌─────────────────────────────────┐
│ May 15, 2026          -12.3%   │  ← date left, drawdown right
├────────────────┬────────────────┤
│ PRICE          │ MULTIPLIER     │
│ $512.40        │ 1.5×           │
├────────────────┼────────────────┤
│ RECOMMENDED    │ EXECUTED       │
│ €750           │ —              │
└─────────────────────────────────┘
```

- Card: `bg-surface-1 rounded-xl p-4`
- Header row: `flex justify-between items-center mb-3`
  - Date: `text-ink font-semibold text-sm` (same `toLocaleDateString` format as `HistoryTable`)
  - Drawdown: `text-sm`, `text-red-400` if `drawdown_pct < -0.1`, else `text-ink-muted`
- Body: `grid grid-cols-2 gap-y-3`
  - Each cell: label `text-ink-muted text-xs font-medium uppercase tracking-wider`, value below in `text-sm`
  - Recommended value: `text-ink font-medium`; all others: `text-ink-muted`
  - Executed shows `—` for `null`
- List wrapper: `flex flex-col gap-3`

**Formatting:** Identical to `HistoryTable` — same date format, `drawdown_pct * 100` for display, `market_price` field, `€` prefix for amounts.

---

## Modified Files

### `frontend/src/App.tsx`

1. Import and render `<BottomNav />` inside the root wrapper, after `<main>`.
2. Hide top tab pills on mobile: wrap the `{TAB_LINKS.map(...)}` div in `hidden sm:flex` (change `flex` → `hidden sm:flex`).
3. Main element: `px-6 py-8` → `px-4 sm:px-6 py-8 pb-24 sm:pb-8`.
   - `pb-24` reserves space above the fixed bottom bar on mobile.
   - `sm:pb-8` restores normal padding on desktop.

### `frontend/src/pages/Dashboard.tsx`

Stat cards grid: `grid grid-cols-3 gap-4` → `grid grid-cols-1 sm:grid-cols-3 gap-4`.

On mobile, the three stat cards (Current Price, 12m High, Base Amount) stack vertically.

### `frontend/src/components/HeroCard.tsx`

Applied to **all four render branches** (loading, error, empty, loaded):
- Padding: `p-8` → `p-5 sm:p-8`
- Recommended amount: `text-5xl` → `text-4xl sm:text-5xl` (loaded branch only)

### `frontend/src/pages/History.tsx`

Render both components, show/hide via Tailwind:

```tsx
<div className="block sm:hidden">
  <HistoryCardList rows={history} />
</div>
<div className="hidden sm:block">
  <HistoryTable rows={history} />
</div>
```

Both receive the same `history` array from the store. No logic change.

### `frontend/src/pages/Settings.tsx`

No changes. The `max-w-lg` constraint and `flex flex-col` form layout already work correctly at 375px.

---

## Untouched Files

`PriceChart.tsx`, `StatCard.tsx`, `HistoryTable.tsx`, `store.ts`, `api.ts`, `vite.config.ts`, `tailwind.config.ts` — no modifications required.

---

## Tests

| File | Tests |
|------|-------|
| `src/__tests__/BottomNav.test.tsx` | Renders 3 links with correct labels; active link receives `border-grad-violet` class; inactive links do not |
| `src/__tests__/HistoryCardList.test.tsx` | Renders one card per row; date formatted correctly; drawdown multiplied by 100; `text-red-400` applied when `drawdown_pct < -0.1`; `—` shown for null `executed_amount` |

Existing 29 tests unchanged. CSS breakpoint visibility (`hidden sm:block`) is not testable in jsdom and is not tested.

---

## Acceptance Criteria

- [ ] AC-001: On a 375px viewport, navigation is provided by a fixed bottom bar with Dashboard / Settings / History tabs
- [ ] AC-002: Active bottom tab has a violet top accent line; inactive tabs are grey
- [ ] AC-003: Top tab pills are hidden below 640px and visible at 640px+
- [ ] AC-004: History page shows card layout below 640px and table layout at 640px+
- [ ] AC-005: Each history card displays date, drawdown, price, multiplier, recommended amount, and executed amount (or —)
- [ ] AC-006: Dashboard stat cards stack to a single column below 640px
- [ ] AC-007: HeroCard padding and font size reduce appropriately on mobile (no overflow)
- [ ] AC-008: Main content bottom padding clears the fixed bottom nav bar on mobile
- [ ] AC-009: All 29 existing tests continue to pass; 2 new test files added
