# Review — WI-20260514-frontendMVP

**Completed:** 2026-05-15
**Outcome:** APPROVED (after fixes)

## Reviewer Findings

### Strengths

- `api.ts` generic `request<T>` helper — clean, no duplication, precise error messages
- Zustand flat slice pattern — correct coordination layer, no business logic in store
- HeroCard 4-state branching — correct `loading > error > empty > loaded` order
- `HistoryTable` field names — `market_price` (not `current_price`), `drawdown_pct * 100` correct
- Dashboard 12m High formula — correct derivation (after fix)
- Test strategy — real store + mocked API, `useState.setState()` for isolation

### Issues Found and Fixed

| # | Severity | File | Issue | Fix Applied |
|---|----------|------|-------|-------------|
| 1 | Critical | Settings.tsx:80 | `setSaveSuccess(true)` ran unconditionally even on API error | Check `!useStore.getState().settingsError` before setting success |
| 2 | Important | Dashboard.tsx:41 | 12m High used `recommendation.drawdown` (possibly absolute $) instead of `drawdown_pct` (decimal proportion) | Changed to `drawdown_pct` |
| 3 | Important | History.tsx:27 | Empty state flashed on mount before `historyLoading` was set true | Added `hasFetched` flag, empty state guarded by `hasFetched && !historyLoading` |
| 4 | Important | Settings.tsx:97 | `saveSuccess` not cleared when user edits form fields | Added `setSaveSuccess(false)` to input `onChange` |

### Issues Noted (Non-Blocking, Not Fixed)

- `useEffect` empty dep arrays — idiomatic Zustand pattern, no actual bug
- `api.ts:48` conditional fetch — preserves test assertion contract, acceptable
- Geist font not installed — plan explicitly specifies Inter Variable for both font families; this is a plan-level decision, not an implementation defect
- `PriceChart.tsx` `tickInterval` for < 12 data points — `interval={0}` shows all ticks, correct behavior

## Final Verdict: APPROVED

All blocking issues resolved. 29/29 tests passing after fixes.
