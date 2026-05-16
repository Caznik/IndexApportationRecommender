# Review — WI-20260516-persistRecommendation

## Outcome: APPROVED

## Acceptance Criteria

- [x] AC-001: Met — `restoreRecommendation()` called on mount via `useEffect`, maps `history[0]` to store; integration test confirms `€620` renders without clicking Generate
- [x] AC-002: Met — early return on `history.length === 0`; "No recommendation yet" shown; integration test + unit test confirm
- [x] AC-003: Met — no `recommendationLoading` set during restore; UI renders immediately with null state while action settles
- [x] AC-004: Met — 60 tests pass (10 files), lint exit 0

## Strengths

- Clean separation: field mapping lives in the store action, not in components
- Guard `get().recommendation !== null` prevents double-fetch and race condition
- `generate()` clears `recommendationRestoredAt: null` — age label disappears on fresh results (tested)
- Silent `catch {}` with comment is appropriate for best-effort restore
- `restoredAt?: string | null` keeps HeroCard backward-compatible with other callers
- `INITIAL` in store.test.ts updated to include `recommendationRestoredAt: null` — test isolation correct
- 7 new tests cover: restore on mount, age label, empty history, guard, empty array, rejection, field mapping

## Issues Noted (Non-blocking)

- Timezone: `new Date(restoredAt)` parses naive ISO strings as local time. Backend sends `+00:00` offset in production (Pydantic v2 + `DateTime(timezone=True)`), so not a production issue. Test fixture deliberately uses naive string with month-only regex to stay CI-stable.
- No integration test for "age label disappears after generate". Store unit test covers the state layer. Acceptable coverage.

## Verification

```
npm run test:run  → 60 passed, 0 failed
npm run lint      → exit 0
```
