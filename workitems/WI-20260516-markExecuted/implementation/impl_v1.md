# Implementation Summary — WI-20260516-markExecuted

## Files Changed

### Backend
- `backend/app/schemas.py` — Added `RecommendationRecordUpdate` schema with `executed_amount: Decimal` field and `@field_validator` rejecting non-positive values (→ 422)
- `backend/app/routers/history.py` — Added `PATCH /{rec_id}` endpoint: fetches by PK, 404 if missing, sets `executed_amount`, commits + refreshes, returns `RecommendationRecord`
- `backend/tests/test_api.py` — Added `_seed_recommendation` helper + 4 tests: 200 happy path, 404 unknown id, 422 zero, 422 negative

### Frontend
- `frontend/src/api.ts` — Added `markExecuted(id, amount)`: PATCH to `/api/history/${id}` with JSON body `{ executed_amount: amount }`, returns `Promise<RecommendationRecord>`
- `frontend/src/store.ts` — Added `markExecuted` to `State` interface + implementation: calls `api.markExecuted`, maps history in-place replacing matching record; errors propagate (no catch)
- `frontend/src/__tests__/store.test.ts` — Added 2 store unit tests: success (in-place replacement, sibling unchanged), failure (error propagates, history unchanged)
- `frontend/src/components/HistoryCardList.tsx` — Added `onMarkExecuted` prop, local `editingId`/`inputValue` state, `startEdit` (pre-fill logic), `handleSave` (keeps edit on error), Edit/Save/Cancel UI per row
- `frontend/src/components/HistoryTable.tsx` — Same edit pattern as HistoryCardList, adapted for table row layout
- `frontend/src/pages/History.tsx` — Subscribes to `markExecuted` from store; passes as `onMarkExecuted` to both list components
- `frontend/src/__tests__/HistoryCardList.test.tsx` — Replaced: added `onMarkExecuted` to all existing renders + 6 new edit tests (Edit button, pre-fill×2, Save, Cancel, single-row-at-a-time)
- `frontend/src/__tests__/HistoryTable.test.tsx` — Created: 6 parallel edit tests for HistoryTable

## Test Results

- Frontend: **75/75 pass** (11 test files)
- Backend new tests: **4/4 pass** (`test_patch_history_*`)
- Backend existing tests: 23 pass, 4 pre-existing failures in `app/services/market.py` (yfinance mock returns `dict` instead of DataFrame — unrelated to this WI, not on any modified call stack)

## Acceptance Criteria Pre-Check

- AC-001: ✅ Edit button per row in both HistoryCardList and HistoryTable
- AC-002: ✅ Pre-fills `recommended_amount` when null, `executed_amount` when set
- AC-003: ✅ Save calls PATCH, store updates row in-place
- AC-004: ✅ Cancel clears `editingId`, no API call
- AC-005: ✅ Endpoint returns 404 / 422 as specified
- AC-006: ✅ All new tests pass; all pre-existing frontend tests pass; 4 pre-existing backend failures are unrelated to this WI
