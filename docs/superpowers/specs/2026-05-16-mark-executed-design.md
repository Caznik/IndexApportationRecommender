# Mark Recommendation as Executed — Design Spec

**Workitem:** WI-20260516-markExecuted

## Goal

Allow users to record the actual amount contributed for any history row, via an inline edit control in the History page. Any row can be edited or corrected at any time.

## Context

`Recommendation.executed_amount` is a nullable `Decimal` column that already exists in the DB and is returned by `GET /api/history`. Both `HistoryCardList` (mobile) and `HistoryTable` (desktop) render it read-only today. No write path exists.

## Architecture

Four layers, each with one responsibility:

| Layer | Change |
|---|---|
| `backend/app/routers/history.py` | New `PATCH /api/history/{id}` endpoint |
| `backend/app/schemas.py` | New `RecommendationRecordUpdate` schema |
| `frontend/src/api.ts` | New `markExecuted(id, amount)` function |
| `frontend/src/store.ts` | New `markExecuted(id, amount)` action |
| `frontend/src/pages/History.tsx` | Subscribe to `markExecuted`; pass as prop |
| `frontend/src/components/HistoryCardList.tsx` | Edit state + Edit/Save/Cancel UI |
| `frontend/src/components/HistoryTable.tsx` | Edit state + Edit/Save/Cancel UI |

## Backend

### Schema (`backend/app/schemas.py`)

```python
class RecommendationRecordUpdate(BaseModel):
    executed_amount: Decimal

    @field_validator("executed_amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("must be greater than 0")
        return v
```

### Endpoint (`backend/app/routers/history.py`)

```python
@router.patch("/{rec_id}", response_model=RecommendationRecord)
def mark_executed(rec_id: int, body: RecommendationRecordUpdate, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, rec_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.executed_amount = body.executed_amount
    db.commit()
    db.refresh(rec)
    return rec
```

- Returns the full updated `RecommendationRecord`.
- 404 if `rec_id` does not exist.
- 422 if `executed_amount` is zero or negative (Pydantic validation).
- No other fields are writable via this endpoint.

## Frontend API

```typescript
// frontend/src/api.ts
export function markExecuted(id: number, amount: number): Promise<RecommendationRecord> {
  return request(`/api/history/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executed_amount: amount }),
  })
}
```

## Store

```typescript
// frontend/src/store.ts — new action on State interface and implementation
markExecuted: async (id: number, amount: number) => {
  const updated = await api.markExecuted(id, amount)
  set((s) => ({
    history: s.history.map((r) => (r.id === id ? updated : r)),
  }))
},
```

- No loading/error state on the store — the component keeps edit mode open on failure.
- On success: replaces the matching record in `history[]` in-place.

## Components

### `History.tsx`

```tsx
const markExecuted = useStore((s) => s.markExecuted)
// Pass onMarkExecuted={markExecuted} to both HistoryCardList and HistoryTable
```

### `HistoryCardList.tsx` and `HistoryTable.tsx`

Both receive the new prop:
```typescript
interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}
```

Each component manages local edit state:
```typescript
const [editingId, setEditingId] = useState<number | null>(null)
const [inputValue, setInputValue] = useState('')
```

**Edit button (at rest):** Each row shows `€{executed_amount}` or `—`, plus a small **Edit** button.

**On Edit click:**
- `editingId = row.id`
- `inputValue = executed_amount !== null ? String(executed_amount) : String(recommended_amount)`
- (Pre-fills with existing value for corrections, recommended amount for new entries)
- Opening Edit on a second row closes the first (single `editingId` state).

**While editing:**
- Executed cell becomes a number `<input>` with `inputValue`
- **Save:** calls `onMarkExecuted(row.id, parseFloat(inputValue))`. On success: clears `editingId`. On error: keeps edit mode open (user can retry).
- **Cancel:** clears `editingId`, no API call.

## Testing

### Backend (`backend/tests/test_history.py`)
- `PATCH /api/history/{id}` valid amount → 200, `executed_amount` updated in response
- `PATCH /api/history/{id}` unknown id → 404
- `PATCH /api/history/{id}` zero amount → 422
- `PATCH /api/history/{id}` negative amount → 422

### Store (`frontend/src/__tests__/store.test.ts`)
- `markExecuted` success: matching record in `history[]` replaced with updated record; other records unchanged
- `markExecuted` failure: error propagates; `history[]` unchanged

### HistoryCardList (`frontend/src/__tests__/HistoryCardList.test.tsx` — extend existing)
- Edit button renders per row
- Clicking Edit pre-fills input with `recommended_amount` when `executed_amount` is null
- Clicking Edit pre-fills input with `executed_amount` when already set
- Save calls `onMarkExecuted(id, amount)`
- Cancel closes edit mode without calling `onMarkExecuted`
- Opening Edit on row 2 closes edit mode on row 1

### HistoryTable (`frontend/src/__tests__/HistoryTable.test.tsx` — new file)
- Same 6 tests as HistoryCardList

## Acceptance Criteria

- AC-001: Any history row has an Edit button that opens an inline input for `executed_amount`
- AC-002: Input pre-fills with `recommended_amount` for new entries; `executed_amount` for corrections
- AC-003: Save calls `PATCH /api/history/{id}`, updates the row in the UI without a full-page reload
- AC-004: Cancel closes edit mode with no API call and no state change
- AC-005: `PATCH` returns 404 for unknown ids, 422 for non-positive amounts
- AC-006: All existing tests continue to pass; new tests cover the above scenarios
