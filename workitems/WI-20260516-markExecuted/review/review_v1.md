# Review — WI-20260516-markExecuted

## Outcome: APPROVED

Reviewed via subagent-driven development (spec compliance + code quality per task + final full review).

## AC Verification

| Criterion | Status | Evidence |
|-----------|--------|---------|
| AC-001: Edit button per row opens inline input | ✅ PASS | HistoryCardList.tsx:92-97, HistoryTable.tsx:94-99 |
| AC-002: Pre-fills correctly (recommended vs executed) | ✅ PASS | startEdit() in both components; tests verify both branches |
| AC-003: Save calls PATCH, in-place UI update | ✅ PASS | api.ts:77-83, store.ts:97-102, routers/history.py:20-28 |
| AC-004: Cancel — no API call, no state change | ✅ PASS | setEditingId(null) only; tests verify onMarkExecuted not called |
| AC-005: PATCH 404/422 errors | ✅ PASS | HTTPException 404 + Pydantic field_validator 422 |
| AC-006: All tests pass, new tests cover scenarios | ✅ PASS | 75/75 frontend, 4/4 new backend; 4 pre-existing backend failures are unrelated |

## Notable Strengths

- Clean four-layer architecture: route → schema → API client → store → component
- Pydantic validator handles 422 without explicit router code
- Single `editingId` scalar prevents multiple simultaneous edits
- `handleSave` error containment keeps UX in edit mode on failure; store rethrows correctly
- HistoryCardList and HistoryTable are behaviorally identical with parallel test coverage
- History.tsx passes same `markExecuted` to both responsive variants

## Non-Blocking Notes (for future consideration)

- Duplicated edit-state logic between the two components (startEdit/handleSave) — could be extracted to a shared hook if more cells become editable
- `parseFloat('')` returns NaN on empty input; backend rejects it with 422, keeping edit mode open. UX polish: disable Save when input is empty/non-positive
- Save/Cancel buttons could benefit from `type="button"` and `aria-label` for accessibility

## Pre-existing Backend Failures

4 backend tests fail in `app/services/market.py:30` (`df.empty` on a `dict` from yfinance mock). These tests (`test_get_market_history_returns_prices`, `test_generate_recommendation`, `test_generate_recommendation_stored_in_history`, `test_get_latest_price_returns_most_recent`) are on a code path this WI did not touch. Needs a separate workitem.
