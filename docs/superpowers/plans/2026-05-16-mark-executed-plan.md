# Mark Recommendation as Executed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to record the actual amount contributed for any history row via a PATCH endpoint and an inline Edit/Save/Cancel control in both the mobile card list and desktop table.

**Architecture:** New `PATCH /api/history/{id}` backend endpoint writes `executed_amount` to the DB and returns the updated record. A `markExecuted` Zustand action calls the endpoint and replaces the record in `history[]` in-place. `History.tsx` passes the action as `onMarkExecuted` to `HistoryCardList` and `HistoryTable`, each of which manages local edit state (`editingId`, `inputValue`).

**Tech Stack:** FastAPI + SQLAlchemy + Pydantic v2 (backend); React 19 + TypeScript + Zustand 5 + Vitest + @testing-library/react (frontend)

---

## File Map

| File | Change |
|------|--------|
| `backend/app/schemas.py` | Add `RecommendationRecordUpdate` schema |
| `backend/app/routers/history.py` | Add `PATCH /{rec_id}` endpoint |
| `backend/tests/test_api.py` | Add 4 PATCH tests + `_seed_recommendation` helper |
| `frontend/src/api.ts` | Add `markExecuted(id, amount)` function |
| `frontend/src/store.ts` | Add `markExecuted` to `State` interface and implementation |
| `frontend/src/__tests__/store.test.ts` | Add 2 `markExecuted` unit tests |
| `frontend/src/components/HistoryCardList.tsx` | Add edit state + Edit/Save/Cancel UI |
| `frontend/src/__tests__/HistoryCardList.test.tsx` | Add `onMarkExecuted` to existing renders + 6 new tests |
| `frontend/src/pages/History.tsx` | Subscribe to `markExecuted`; pass to both list components |
| `frontend/src/components/HistoryTable.tsx` | Add edit state + Edit/Save/Cancel UI |
| `frontend/src/__tests__/HistoryTable.test.tsx` | Create — 6 edit tests |

---

### Task 1: Backend — PATCH /api/history/{id}

**Files:**
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/routers/history.py`
- Test: `backend/tests/test_api.py`

---

- [ ] **Step 1: Write the failing tests**

Open `backend/tests/test_api.py`. Add the `_seed_recommendation` helper and 4 tests. Add these imports at the top of the file if not already present:

```python
from datetime import date, timedelta, datetime, timezone
```

And add `Recommendation` to the models import:

```python
from app.models import MarketPrice, Settings, Recommendation
```

Add the helper and tests at the end of the file:

```python
def _seed_recommendation(db):
    rec = Recommendation(
        created_at=datetime.now(timezone.utc),
        ticker="URTH",
        market_price=Decimal("97.40"),
        drawdown=Decimal("-0.082000"),
        drawdown_pct=Decimal("-8.20"),
        multiplier=Decimal("1.20"),
        rule_triggered="-5% band",
        recommended_amount=Decimal("620.00"),
        executed_amount=None,
        explanation="Market is 8.2% below its 12-month high.",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def test_patch_history_sets_executed_amount(client, db):
    rec = _seed_recommendation(db)
    r = client.patch(f"/api/history/{rec.id}", json={"executed_amount": "600.00"})
    assert r.status_code == 200
    assert r.json()["executed_amount"] == "600.00"
    assert r.json()["id"] == rec.id


def test_patch_history_returns_404_for_unknown_id(client, db):
    r = client.patch("/api/history/999", json={"executed_amount": "600.00"})
    assert r.status_code == 404


def test_patch_history_returns_422_for_zero_amount(client, db):
    rec = _seed_recommendation(db)
    r = client.patch(f"/api/history/{rec.id}", json={"executed_amount": "0"})
    assert r.status_code == 422


def test_patch_history_returns_422_for_negative_amount(client, db):
    rec = _seed_recommendation(db)
    r = client.patch(f"/api/history/{rec.id}", json={"executed_amount": "-50"})
    assert r.status_code == 422
```

---

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_api.py -k "patch_history" -v
```

Expected: 4 FAILED — `404 Method Not Allowed` or similar (endpoint doesn't exist yet).

---

- [ ] **Step 3: Add the schema**

Open `backend/app/schemas.py`. Add `RecommendationRecordUpdate` after the `RecommendationRecord` class:

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

---

- [ ] **Step 4: Add the endpoint**

Open `backend/app/routers/history.py`. Replace the entire file with:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation
from app.schemas import RecommendationRecord, RecommendationRecordUpdate

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[RecommendationRecord])
def get_history(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Recommendation).order_by(Recommendation.created_at.desc())
    ).scalars().all()
    return rows


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

---

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_api.py -k "patch_history" -v
```

Expected: 4 PASSED.

Then run the full backend suite to check for regressions:

```bash
cd backend && python -m pytest -v
```

Expected: all tests pass.

---

### Task 2: Frontend API + Store

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/store.ts`
- Test: `frontend/src/__tests__/store.test.ts`

---

- [ ] **Step 1: Write the failing store tests**

Open `frontend/src/__tests__/store.test.ts`. Add a `describe('markExecuted', ...)` block after the existing `describe('restoreRecommendation', ...)` block:

```typescript
describe('markExecuted', () => {
  const updatedRecord: RecommendationRecord = { ...mockRecord, executed_amount: 600 }

  it('replaces matching record in history on success', async () => {
    const other: RecommendationRecord = { ...mockRecord, id: 2 }
    useStore.setState({ history: [mockRecord, other] })
    mockApi.markExecuted.mockResolvedValue(updatedRecord)
    await useStore.getState().markExecuted(1, 600)
    const history = useStore.getState().history
    expect(history[0]).toEqual(updatedRecord)
    expect(history[1]).toEqual(other)
  })

  it('propagates error and leaves history unchanged on failure', async () => {
    useStore.setState({ history: [mockRecord] })
    mockApi.markExecuted.mockRejectedValue(new Error('HTTP 500'))
    await expect(useStore.getState().markExecuted(1, 600)).rejects.toThrow('HTTP 500')
    expect(useStore.getState().history[0]).toEqual(mockRecord)
  })
})
```

---

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/store.test.ts
```

Expected: FAIL — `markExecuted is not a function` (action not yet defined).

---

- [ ] **Step 3: Add the API function**

Open `frontend/src/api.ts`. Add at the end of the file:

```typescript
export function markExecuted(id: number, amount: number): Promise<RecommendationRecord> {
  return request(`/api/history/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executed_amount: amount }),
  })
}
```

---

- [ ] **Step 4: Add the store action**

Open `frontend/src/store.ts`.

Add `markExecuted` to the `State` interface (after `fetchHistory`):

```typescript
  markExecuted: (id: number, amount: number) => Promise<void>
```

Add the implementation inside `create<State>((set, get) => ({ ... }))`, after `fetchHistory`:

```typescript
  markExecuted: async (id: number, amount: number) => {
    const updated = await api.markExecuted(id, amount)
    set((s) => ({
      history: s.history.map((r) => (r.id === id ? updated : r)),
    }))
  },
```

---

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
cd frontend && npx vitest run src/__tests__/store.test.ts
```

Expected: all store tests pass (the 2 new tests plus all existing ones).

---

### Task 3: HistoryCardList — inline edit UI

**Files:**
- Modify: `frontend/src/components/HistoryCardList.tsx`
- Modify: `frontend/src/pages/History.tsx`
- Modify: `frontend/src/__tests__/HistoryCardList.test.tsx`

---

- [ ] **Step 1: Write the failing tests**

Open `frontend/src/__tests__/HistoryCardList.test.tsx`. Replace the entire file with the following (adds `onMarkExecuted` to all existing renders and adds 6 new edit tests):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryCardList } from '../components/HistoryCardList'
import type { RecommendationRecord } from '../api'

const baseRow: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-15T10:00:00Z',
  ticker: 'URTH',
  market_price: 512.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 600,
  executed_amount: null,
  explanation: '',
}

describe('HistoryCardList', () => {
  it('renders one card per row', () => {
    const rows = [baseRow, { ...baseRow, id: 2 }]
    render(<HistoryCardList rows={rows} onMarkExecuted={vi.fn()} />)
    expect(screen.getAllByText('May 15, 2026')).toHaveLength(2)
  })

  it('formats drawdown by multiplying by 100', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('-8.2%')).toBeInTheDocument()
  })

  it('shows — for null executed_amount', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows formatted executed amount when present', () => {
    render(<HistoryCardList rows={[{ ...baseRow, executed_amount: 550 }]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('€550')).toBeInTheDocument()
  })

  it('applies text-red-400 for deep drawdown (drawdown_pct < -0.1)', () => {
    render(<HistoryCardList rows={[{ ...baseRow, drawdown_pct: -0.15 }]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('-15.0%')).toHaveClass('text-red-400')
  })

  it('does not apply text-red-400 for shallow drawdown', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('-8.2%')).not.toHaveClass('text-red-400')
  })

  it('renders an Edit button for each row', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('pre-fills input with recommended_amount when executed_amount is null', async () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(600)
  })

  it('pre-fills input with executed_amount when already set', async () => {
    render(<HistoryCardList rows={[{ ...baseRow, executed_amount: 550 }]} onMarkExecuted={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(550)
  })

  it('calls onMarkExecuted with id and amount when Save clicked', async () => {
    const onMarkExecuted = vi.fn().mockResolvedValue(undefined)
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={onMarkExecuted} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onMarkExecuted).toHaveBeenCalledWith(1, 600))
  })

  it('closes edit mode without calling onMarkExecuted when Cancel clicked', async () => {
    const onMarkExecuted = vi.fn()
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={onMarkExecuted} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onMarkExecuted).not.toHaveBeenCalled()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('opening Edit on a second row closes edit mode on the first', async () => {
    const rows = [baseRow, { ...baseRow, id: 2, created_at: '2026-05-16T10:00:00Z' }]
    render(<HistoryCardList rows={rows} onMarkExecuted={vi.fn()} />)
    const [editBtn1, editBtn2] = screen.getAllByRole('button', { name: /edit/i })
    await userEvent.click(editBtn1)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    await userEvent.click(editBtn2)
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
  })
})
```

---

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/HistoryCardList.test.tsx
```

Expected: existing tests FAIL (missing `onMarkExecuted` prop causes TypeScript or runtime error) and new tests FAIL (Edit button not present).

---

- [ ] **Step 3: Implement HistoryCardList**

Replace `frontend/src/components/HistoryCardList.tsx` entirely:

```tsx
import { useState } from 'react'
import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}

export function HistoryCardList({ rows, onMarkExecuted }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')

  function startEdit(row: RecommendationRecord) {
    setEditingId(row.id)
    setInputValue(
      row.executed_amount !== null
        ? String(row.executed_amount)
        : String(row.recommended_amount)
    )
  }

  async function handleSave(id: number) {
    try {
      await onMarkExecuted(id, parseFloat(inputValue))
      setEditingId(null)
    } catch {
      // keep edit mode open — user can retry or cancel
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const date = new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })
        const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
        const isDeepDrawdown = Number(row.drawdown_pct) < -0.1
        const isEditing = editingId === row.id

        return (
          <div key={row.id} className="bg-surface-1 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-ink font-semibold text-sm">{date}</span>
              <span className={`text-sm ${isDeepDrawdown ? 'text-red-400' : 'text-ink-muted'}`}>
                {drawdownPct}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-3">
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Price</p>
                <p className="text-ink-muted text-sm">${Number(row.market_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Multiplier</p>
                <p className="text-ink-muted text-sm">{Number(row.multiplier).toFixed(1)}×</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Recommended</p>
                <p className="text-ink font-medium text-sm">€{Number(row.recommended_amount).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-ink-muted text-xs font-medium uppercase tracking-wider">Executed</p>
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-20 bg-surface-2 text-ink text-sm rounded px-2 py-0.5 border border-hairline"
                    />
                    <button
                      onClick={() => handleSave(row.id)}
                      className="text-xs text-ink-muted hover:text-ink"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-ink-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-ink-muted text-sm">
                      {row.executed_amount != null
                        ? `€${Number(row.executed_amount).toFixed(0)}`
                        : '—'}
                    </p>
                    <button
                      onClick={() => startEdit(row)}
                      className="text-xs text-ink-muted hover:text-ink underline"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

---

- [ ] **Step 4: Wire History.tsx**

Open `frontend/src/pages/History.tsx`. Replace the entire file:

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'
import { HistoryCardList } from '../components/HistoryCardList'

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const markExecuted = useStore((s) => s.markExecuted)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    fetchHistory().finally(() => setHasFetched(true))
  }, [fetchHistory])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">History</h1>

      {historyLoading && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-32" />
      )}

      {historyError && (
        <p className="text-ink-muted text-sm">{historyError}</p>
      )}

      {hasFetched && !historyLoading && !historyError && history.length === 0 && (
        <div className="bg-surface-1 rounded-xl p-8 text-center">
          <p className="text-ink-muted text-sm">
            No recommendations yet. Generate one from the Dashboard.
          </p>
        </div>
      )}

      {!historyLoading && !historyError && history.length > 0 && (
        <>
          <div className="block sm:hidden">
            <HistoryCardList rows={history} onMarkExecuted={markExecuted} />
          </div>
          <div className="hidden sm:block bg-surface-1 rounded-xl p-6">
            <HistoryTable rows={history} onMarkExecuted={markExecuted} />
          </div>
        </>
      )}
    </div>
  )
}
```

Note: `HistoryTable` will gain its `onMarkExecuted` prop in Task 4 — TypeScript will error until then. If TypeScript errors block your test run, complete Task 4 immediately after this step.

---

- [ ] **Step 5: Run HistoryCardList tests**

```bash
cd frontend && npx vitest run src/__tests__/HistoryCardList.test.tsx
```

Expected: all 12 tests pass (6 existing + 6 new).

---

### Task 4: HistoryTable — inline edit UI

**Files:**
- Modify: `frontend/src/components/HistoryTable.tsx`
- Create: `frontend/src/__tests__/HistoryTable.test.tsx`

(History.tsx was already updated in Task 3 Step 4 to pass `onMarkExecuted` to HistoryTable.)

---

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/HistoryTable.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryTable } from '../components/HistoryTable'
import type { RecommendationRecord } from '../api'

const baseRow: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-15T10:00:00Z',
  ticker: 'URTH',
  market_price: 512.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 600,
  executed_amount: null,
  explanation: '',
}

describe('HistoryTable', () => {
  it('renders an Edit button for each row', () => {
    render(<HistoryTable rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('pre-fills input with recommended_amount when executed_amount is null', async () => {
    render(<HistoryTable rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(600)
  })

  it('pre-fills input with executed_amount when already set', async () => {
    render(<HistoryTable rows={[{ ...baseRow, executed_amount: 550 }]} onMarkExecuted={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(550)
  })

  it('calls onMarkExecuted with id and amount when Save clicked', async () => {
    const onMarkExecuted = vi.fn().mockResolvedValue(undefined)
    render(<HistoryTable rows={[baseRow]} onMarkExecuted={onMarkExecuted} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onMarkExecuted).toHaveBeenCalledWith(1, 600))
  })

  it('closes edit mode without calling onMarkExecuted when Cancel clicked', async () => {
    const onMarkExecuted = vi.fn()
    render(<HistoryTable rows={[baseRow]} onMarkExecuted={onMarkExecuted} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onMarkExecuted).not.toHaveBeenCalled()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('opening Edit on a second row closes edit mode on the first', async () => {
    const rows = [baseRow, { ...baseRow, id: 2, created_at: '2026-05-16T10:00:00Z' }]
    render(<HistoryTable rows={rows} onMarkExecuted={vi.fn()} />)
    const [editBtn1, editBtn2] = screen.getAllByRole('button', { name: /edit/i })
    await userEvent.click(editBtn1)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    await userEvent.click(editBtn2)
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
  })
})
```

---

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/HistoryTable.test.tsx
```

Expected: FAIL — `onMarkExecuted` prop missing, Edit button not present.

---

- [ ] **Step 3: Implement HistoryTable**

Replace `frontend/src/components/HistoryTable.tsx` entirely:

```tsx
import { useState } from 'react'
import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}

const HEADERS = ['Date', 'Price', 'Drawdown', 'Multiplier', 'Recommended', 'Executed']

export function HistoryTable({ rows, onMarkExecuted }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')

  function startEdit(row: RecommendationRecord) {
    setEditingId(row.id)
    setInputValue(
      row.executed_amount !== null
        ? String(row.executed_amount)
        : String(row.recommended_amount)
    )
  }

  async function handleSave(id: number) {
    try {
      await onMarkExecuted(id, parseFloat(inputValue))
      setEditingId(null)
    } catch {
      // keep edit mode open — user can retry or cancel
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h}
                className="text-left text-ink text-xs font-medium uppercase tracking-wider pb-3 pr-4"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const date = new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
            const isDeepDrawdown = Number(row.drawdown_pct) < -0.1
            const isEditing = editingId === row.id
            return (
              <tr key={row.id} className="border-t border-hairline-soft">
                <td className="text-ink-muted py-3 pr-4">{date}</td>
                <td className="text-ink-muted py-3 pr-4">${Number(row.market_price).toFixed(2)}</td>
                <td className={`py-3 pr-4 ${isDeepDrawdown ? 'text-red-400' : 'text-ink-muted'}`}>
                  {drawdownPct}
                </td>
                <td className="text-ink-muted py-3 pr-4">{Number(row.multiplier).toFixed(1)}×</td>
                <td className="text-ink py-3 pr-4 font-medium">€{Number(row.recommended_amount).toFixed(0)}</td>
                <td className="text-ink-muted py-3 pr-4">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-20 bg-surface-2 text-ink text-sm rounded px-2 py-0.5 border border-hairline"
                      />
                      <button
                        onClick={() => handleSave(row.id)}
                        className="text-xs text-ink-muted hover:text-ink"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-ink-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>
                        {row.executed_amount != null
                          ? `€${Number(row.executed_amount).toFixed(0)}`
                          : '—'}
                      </span>
                      <button
                        onClick={() => startEdit(row)}
                        className="text-xs text-ink-muted hover:text-ink underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

---

- [ ] **Step 4: Run all tests to confirm everything passes**

```bash
cd frontend && npm run test:run
```

Expected: all tests pass (61 existing + 2 store + 6 HistoryCardList + 6 HistoryTable = 75 total), 0 failed.

Also run lint:

```bash
cd frontend && npm run lint
```

Expected: exit 0, zero violations.

---

## Acceptance Criteria Checklist

- [ ] AC-001: Any history row has an Edit button that opens an inline input for `executed_amount`
- [ ] AC-002: Input pre-fills with `recommended_amount` for new entries; `executed_amount` for corrections
- [ ] AC-003: Save calls `PATCH /api/history/{id}`, updates the row in the UI without a full-page reload
- [ ] AC-004: Cancel closes edit mode with no API call and no state change
- [ ] AC-005: `PATCH` returns 404 for unknown ids, 422 for non-positive amounts
- [ ] AC-006: All tests pass (frontend + backend)
