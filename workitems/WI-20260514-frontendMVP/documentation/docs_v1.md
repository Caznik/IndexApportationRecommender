# Documentation — WI-20260514-frontendMVP

**Date:** 2026-05-15
**Status:** DONE

---

## Implementation Summary

Built the full React 19 + Vite 5 + TypeScript frontend SPA for IndexApportationRecommender. Three views (Dashboard, Settings, History) wired to the existing FastAPI backend via a typed API module and a Zustand global store.

### Files Created

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite + Vitest config, /api proxy to :8000 |
| `frontend/tailwind.config.ts` | DESIGN.md tokens mapped to Tailwind v3 theme |
| `frontend/postcss.config.js` | Tailwind + autoprefixer |
| `frontend/src/index.css` | Tailwind directives, Inter Variable import, :root defaults |
| `frontend/src/setupTests.ts` | @testing-library/jest-dom |
| `frontend/src/api.ts` | 5 typed fetch functions + 5 TypeScript interfaces |
| `frontend/src/store.ts` | Zustand flat store — recommendation + settings + history slices |
| `frontend/src/main.tsx` | ReactDOM root, BrowserRouter, nested Routes |
| `frontend/src/App.tsx` | Tab nav shell (NavLink pills) + Outlet |
| `frontend/src/components/StatCard.tsx` | surface-1 stat tile |
| `frontend/src/components/HeroCard.tsx` | Gradient spotlight card (4 states: empty/loading/error/loaded) |
| `frontend/src/components/PriceChart.tsx` | Recharts AreaChart, violet gradient fill |
| `frontend/src/components/HistoryTable.tsx` | Comparison-row table, 6 columns |
| `frontend/src/pages/Dashboard.tsx` | Hero + stat cards + chart |
| `frontend/src/pages/Settings.tsx` | Controlled form, validation, success/error feedback |
| `frontend/src/pages/History.tsx` | Fetches on mount, renders HistoryTable or empty state |

### Tests

| File | Tests | Coverage |
|------|-------|----------|
| `src/__tests__/api.test.ts` | 6 | Endpoint URLs, methods, error throwing |
| `src/__tests__/store.test.ts` | 5 | Slice success + error paths |
| `src/__tests__/HeroCard.test.tsx` | 5 | All 4 states + click handler |
| `src/__tests__/PriceChart.test.tsx` | 2 | Smoke tests (data + loading) |
| `src/__tests__/Dashboard.test.tsx` | 4 | Empty state, generate, result, loading |
| `src/__tests__/Settings.test.tsx` | 4 | Form render, save payload, validation, success |
| `src/__tests__/History.test.tsx` | 3 | Empty state, row render, null executed_amount |

**Total: 29 tests, 29 passing**

### Acceptance Criteria

All 7 ACs from the spec satisfied:

- [x] AC-001: Dashboard shows recommendation data
- [x] AC-002: Price chart from GET /api/market/history
- [x] AC-003: Settings persist via PUT, reload via GET
- [x] AC-004: History table from GET /api/history
- [x] AC-005: Generate button calls POST and updates dashboard
- [x] AC-006: Loading and error states handled gracefully
- [x] AC-007: UI responsive and styled with Tailwind CSS

---

## Documentation Changes

- **README.md** updated: added frontend setup section (npm install, npm run dev), frontend test commands, route table (/, /settings, /history)

---

## Patterns Documented

`workitems/WI-20260514-frontendMVP/documentation/patterns/ui-WI-20260514-frontendMVP.md`

- Real store + mocked API component test pattern
- Zustand selector pattern (`useStore((s) => s.field)`)
- Flat slice state with namespaced fields
- Async slice action three-phase pattern (start / success / error)
- `drawdown_pct` decimal convention (multiply by 100 for display)
- 12m High derivation from `current_price / (1 + drawdown_pct)`
- `hasFetched` guard for empty states
- Post-save success guarded by store error check

---

## Post-Review Fixes Applied

Issues found during the REVIEWING phase and fixed before DONE:

1. `Settings.tsx` — `saveSuccess` showed even on API failure (now guarded by `!settingsError`)
2. `Dashboard.tsx` — 12m High used `drawdown` instead of `drawdown_pct` (now using proportion)
3. `History.tsx` — empty state flashed before first fetch (now guarded by `hasFetched` flag)
4. `Settings.tsx` — `saveSuccess` not cleared on field edit (now cleared in `onChange`)
