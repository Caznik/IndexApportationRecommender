# Implementation Summary — WI-20260514-frontendMVP

**Completed:** 2026-05-15

## Files Created

| File | Description |
|------|-------------|
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
| `frontend/src/components/HistoryTable.tsx` | Comparison-row table with 6 columns |
| `frontend/src/pages/Dashboard.tsx` | Hero + stat cards + chart, calls generate/fetchSettings |
| `frontend/src/pages/Settings.tsx` | Controlled form, client-side validation, success/error feedback |
| `frontend/src/pages/History.tsx` | Fetches history on mount, renders HistoryTable or empty state |

## Tests Added

| File | Tests |
|------|-------|
| `frontend/src/__tests__/api.test.ts` | 6 — endpoint URLs, methods, error handling |
| `frontend/src/__tests__/store.test.ts` | 5 — slice success + error paths |
| `frontend/src/__tests__/HeroCard.test.tsx` | 5 — all 4 states + click handler |
| `frontend/src/__tests__/PriceChart.test.tsx` | 2 — smoke tests (data + loading) |
| `frontend/src/__tests__/Dashboard.test.tsx` | 4 — empty state, generate call, result display, loading |
| `frontend/src/__tests__/Settings.test.tsx` | 4 — form render, save payload, validation, success message |
| `frontend/src/__tests__/History.test.tsx` | 3 — empty state, row render, null executed_amount |

**Total: 29 tests, 29 passing**

## Acceptance Criteria Pre-Check

- [x] AC-001: Dashboard shows recommendation data — HeroCard loaded state + StatCards
- [x] AC-002: Price chart from GET /api/market/history — PriceChart + getPriceHistory()
- [x] AC-003: Settings persist via PUT/GET — Settings page + settingsSlice
- [x] AC-004: History table from GET /api/history — History page + HistoryTable
- [x] AC-005: Generate button calls POST and updates dashboard — generate() action wired to HeroCard
- [x] AC-006: Loading and error states — per-slice loading/error + HeroCard states
- [x] AC-007: Responsive + Tailwind — DESIGN.md tokens in tailwind.config.ts, responsive classes throughout

## Notable Decisions

- React 19 (not 18) — latest scaffold default; patterns are identical
- Inter Variable for both body and display fonts — Geist was specified in the original DESIGN.md as GT Walsheim substitute, but the approved implementation plan uses Inter Variable throughout
- `drawdown_pct` is a decimal proportion (-0.082); multiplied by 100 for display
- `RecommendationRecord.market_price` (not `current_price`) — matches backend schema
- Negative diff vs base renders as `-€120` (sign before euro symbol)
- Zustand selector pattern (`useStore((s) => s.X)`) used throughout; naked `useStore()` never used
