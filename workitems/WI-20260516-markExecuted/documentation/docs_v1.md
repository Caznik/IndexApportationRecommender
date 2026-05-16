# Documentation — WI-20260516-markExecuted

## Changes

### README.md

Added `PATCH /api/history/{id}` to the API endpoints table.

### Pattern Doc

`documentation/patterns/feature-WI-20260516-markExecuted.md` — captures the inline-edit pattern for nullable fields: PATCH endpoint + Pydantic validator + store action without try/catch + local `editingId`/`inputValue` state + pre-fill logic.

## Impacted Modules

| Module | Impact |
|--------|--------|
| `backend/app/schemas.py` | New `RecommendationRecordUpdate` schema |
| `backend/app/routers/history.py` | New PATCH endpoint |
| `frontend/src/api.ts` | New `markExecuted` API function |
| `frontend/src/store.ts` | New `markExecuted` store action |
| `frontend/src/components/HistoryCardList.tsx` | Edit UI added |
| `frontend/src/components/HistoryTable.tsx` | Edit UI added |
| `frontend/src/pages/History.tsx` | Subscribes to `markExecuted`, passes to both components |

## Tests Added / Updated

| File | Change | Count |
|------|--------|-------|
| `backend/tests/test_api.py` | +`_seed_recommendation` helper + 4 PATCH tests | +4 |
| `frontend/src/__tests__/store.test.ts` | +2 markExecuted tests | +2 |
| `frontend/src/__tests__/HistoryCardList.test.tsx` | Full replacement: `onMarkExecuted` added to existing + 6 new edit tests | +6 |
| `frontend/src/__tests__/HistoryTable.test.tsx` | Created: 6 edit tests | +6 |
| **Total new tests** | | **+18** |

## Known Pre-existing Issue

4 backend tests fail in `app/services/market.py` (yfinance mock returns `dict` instead of DataFrame). These failures predate this workitem and are unrelated to the history write path. Needs a separate workitem to fix.
