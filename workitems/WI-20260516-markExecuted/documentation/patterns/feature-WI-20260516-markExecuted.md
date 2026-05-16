# Pattern: Inline Edit for a Nullable Field (WI-20260516-markExecuted)

## Context

Adding an inline edit control for a nullable column that is already returned read-only by an existing API. No schema migration needed — the column already exists.

## Pattern

### Backend write endpoint

- Add a `PATCH /{id}` endpoint alongside an existing `GET` on the same router.
- Pydantic schema for the write body contains only the writable field(s). Use `@field_validator` for business rules (non-positive amounts → 422).
- Fetch by PK with `db.get(Model, id)` (uses SQLAlchemy identity map). Raise 404 explicitly if not found.
- Commit, refresh, return the full read schema so the client can replace the record in-place.

### Frontend API function

- Thin wrapper around the shared `request()` helper. PATCH with `Content-Type: application/json`.
- Returns `Promise<RecordType>` — the full updated record, not just the changed field.

### Zustand store action

- Calls the API function, then maps over the relevant slice replacing only the matching record.
- **No try/catch** — propagate errors so the component can decide what to do (keep edit mode open, show an error, etc.).

### Component edit state

- `editingId: number | null` — single scalar. Only one row editable at a time; switching rows auto-closes the previous.
- `inputValue: string` — stored as string (controlled input), parsed with `parseFloat` on Save.
- Pre-fill logic: `executed_amount !== null ? String(executed_amount) : String(recommended_amount)`.
- `handleSave`: try/await the store action, clear `editingId` on success, do nothing on error (edit mode stays open for retry).
- Cancel: `setEditingId(null)` only — no API call.

### Wiring in the page component

- Subscribe to the store action with `useStore((s) => s.action)`.
- Pass as `onMarkExecuted` prop to all list/table components that render the field.

## Files Touched (typical)

| Layer | File | Change |
|-------|------|--------|
| Backend schema | `backend/app/schemas.py` | New write-body schema with validator |
| Backend router | `backend/app/routers/<router>.py` | PATCH endpoint |
| Backend tests | `backend/tests/test_api.py` | Seed helper + 4 PATCH tests (200, 404, 422×2) |
| API client | `frontend/src/api.ts` | `markX(id, value)` function |
| Store | `frontend/src/store.ts` | Action in interface + implementation |
| Store tests | `frontend/src/__tests__/store.test.ts` | 2 tests (success replacement, error propagation) |
| List component | `frontend/src/components/XList.tsx` | `onMarkX` prop, edit state, Edit/Save/Cancel UI |
| Table component | `frontend/src/components/XTable.tsx` | Same pattern as list component |
| Page | `frontend/src/pages/X.tsx` | Subscribe + pass prop to both responsive variants |
| List tests | `frontend/src/__tests__/XList.test.tsx` | 6 edit tests (button, pre-fill×2, save, cancel, single-edit-at-a-time) |
| Table tests | `frontend/src/__tests__/XTable.test.tsx` | Parallel 6 tests |

## Test Count Delta

Per field: +4 backend + 2 store + 6 card list + 6 table = **+18 tests**.
