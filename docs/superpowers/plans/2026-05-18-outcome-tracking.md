# Outcome Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For each executed history record, show how the entry price performed at +30, +90, and +180 days via a lazy-loaded expandable panel.

**Architecture:** A new `GET /api/history/{id}/outcomes` endpoint queries the existing `market_prices` table to find the closest price at each target date; it returns a three-snapshot `OutcomeResponse`. The frontend expands a panel per executed row, calls the endpoint on open, and renders coloured `available` or countdown `pending` chips.

**Tech Stack:** Python 3.12 · FastAPI · SQLAlchemy · Pydantic v2 · React 18 · TypeScript · Vitest · Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/app/schemas.py` | Modify | Add `OutcomeAvailable`, `OutcomePending`, `OutcomeResponse` schemas |
| `backend/app/services/market.py` | Modify | Add `get_price_at_or_before` |
| `backend/app/routers/history.py` | Modify | Add `GET /{rec_id}/outcomes` endpoint |
| `backend/tests/test_api.py` | Modify | Add 7 new tests |
| `frontend/src/api.ts` | Modify | Add `OutcomeSnapshot`, `OutcomeResponse` types + `getOutcomes` |
| `frontend/src/components/OutcomePanel.tsx` | Create | Fetch-on-mount component rendering 3 chips |
| `frontend/src/components/HistoryCardList.tsx` | Modify | Add expand toggle + `OutcomePanel` for executed rows |
| `frontend/src/components/HistoryTable.tsx` | Modify | Add expand toggle + `OutcomePanel` for executed rows |
| `frontend/src/__tests__/OutcomePanel.test.tsx` | Create | 5 unit tests for the new component |
| `frontend/src/__tests__/HistoryCardList.test.tsx` | Modify | 3 new tests for expand toggle behaviour |
| `frontend/src/__tests__/HistoryTable.test.tsx` | Modify | 3 new tests for expand toggle behaviour |

---

## Task 1: Backend — Pydantic schemas

**Files:**
- Modify: `backend/app/schemas.py`

- [ ] **Step 1: Add imports and new schemas**

Open `backend/app/schemas.py`. The file currently imports `from typing import Literal`. Change the import line to:

```python
from typing import Annotated, Literal, Union
```

Also add `Field` to the pydantic import so the line reads:

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
```

Append the following at the end of the file (after the existing `PricePoint` class):

```python
class OutcomeAvailable(BaseModel):
    status: Literal["available"]
    price: Decimal
    pct: Decimal


class OutcomePending(BaseModel):
    status: Literal["pending"]
    days_remaining: int


OutcomeSnapshot = Annotated[
    Union[OutcomeAvailable, OutcomePending],
    Field(discriminator="status"),
]


class OutcomeResponse(BaseModel):
    one_m: OutcomeSnapshot
    three_m: OutcomeSnapshot
    six_m: OutcomeSnapshot
```

- [ ] **Step 2: Verify Python syntax**

```
cd backend && python -c "from app.schemas import OutcomeResponse, OutcomeAvailable, OutcomePending; print('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```
git add backend/app/schemas.py
git commit -m "feat(schemas): add OutcomeAvailable, OutcomePending, OutcomeResponse"
```

---

## Task 2: Backend — `get_price_at_or_before` service function (TDD)

**Files:**
- Modify: `backend/app/services/market.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the three failing unit tests**

Append the following section to `backend/tests/test_api.py` (after the existing PATCH History section):

```python
# --- get_price_at_or_before unit tests ---

def test_get_price_at_or_before_exact_match(db):
    from app.services.market import get_price_at_or_before
    db.add(MarketPrice(ticker="URTH", date=date(2025, 1, 15), close_price=Decimal("100.00")))
    db.commit()
    result = get_price_at_or_before("URTH", date(2025, 1, 15), db)
    assert result == Decimal("100.00")


def test_get_price_at_or_before_nearest_before(db):
    from app.services.market import get_price_at_or_before
    db.add(MarketPrice(ticker="URTH", date=date(2025, 1, 13), close_price=Decimal("99.50")))
    db.commit()
    result = get_price_at_or_before("URTH", date(2025, 1, 15), db)
    assert result == Decimal("99.50")


def test_get_price_at_or_before_no_data_returns_none(db):
    from app.services.market import get_price_at_or_before
    result = get_price_at_or_before("URTH", date(2025, 1, 15), db)
    assert result is None
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd backend && python -m pytest tests/test_api.py::test_get_price_at_or_before_exact_match tests/test_api.py::test_get_price_at_or_before_nearest_before tests/test_api.py::test_get_price_at_or_before_no_data_returns_none -v
```

Expected: 3 × `FAILED` with `ImportError` or `AttributeError` (function does not exist yet).

- [ ] **Step 3: Implement `get_price_at_or_before`**

Append to `backend/app/services/market.py` (after `get_price_history`):

```python
def get_price_at_or_before(ticker: str, target_date: date, db: Session) -> Decimal | None:
    row = db.execute(
        select(MarketPrice)
        .where(MarketPrice.ticker == ticker, MarketPrice.date <= target_date)
        .order_by(MarketPrice.date.desc())
        .limit(1)
    ).scalar_one_or_none()
    return row.close_price if row is not None else None
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd backend && python -m pytest tests/test_api.py::test_get_price_at_or_before_exact_match tests/test_api.py::test_get_price_at_or_before_nearest_before tests/test_api.py::test_get_price_at_or_before_no_data_returns_none -v
```

Expected: 3 × `PASSED`

- [ ] **Step 5: Commit**

```
git add backend/app/services/market.py backend/tests/test_api.py
git commit -m "feat(market): add get_price_at_or_before"
```

---

## Task 3: Backend — `GET /api/history/{id}/outcomes` endpoint (TDD)

**Files:**
- Modify: `backend/app/routers/history.py`
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Write the four failing integration tests**

Append the following to `backend/tests/test_api.py` (after the `get_price_at_or_before` unit tests):

```python
# --- GET /api/history/{id}/outcomes ---

def _seed_executed_recommendation(db, days_old: int, market_price: str = "90.00"):
    created = datetime.now(timezone.utc) - timedelta(days=days_old)
    rec = Recommendation(
        created_at=created,
        ticker="URTH",
        market_price=Decimal(market_price),
        drawdown=Decimal("-0.082000"),
        drawdown_pct=Decimal("-8.20"),
        multiplier=Decimal("1.20"),
        rule_triggered="-5% band",
        recommended_amount=Decimal("620.00"),
        executed_amount=Decimal("620.00"),
        explanation="test",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def test_outcomes_all_available(client, db):
    rec = _seed_executed_recommendation(db, days_old=210)
    rec_date = rec.created_at.date()
    for days, price in [(30, "94.50"), (90, "91.80"), (180, "99.00")]:
        db.add(MarketPrice(ticker="URTH", date=rec_date + timedelta(days=days), close_price=Decimal(price)))
    db.commit()

    r = client.get(f"/api/history/{rec.id}/outcomes")
    assert r.status_code == 200
    data = r.json()
    assert data["one_m"]["status"] == "available"
    assert data["three_m"]["status"] == "available"
    assert data["six_m"]["status"] == "available"
    assert data["one_m"]["pct"] == "5.00"   # (94.50-90.00)/90.00*100 = 5.00


def test_outcomes_partial_pending(client, db):
    rec = _seed_executed_recommendation(db, days_old=60)
    rec_date = rec.created_at.date()
    db.add(MarketPrice(ticker="URTH", date=rec_date + timedelta(days=30), close_price=Decimal("94.50")))
    db.commit()

    r = client.get(f"/api/history/{rec.id}/outcomes")
    assert r.status_code == 200
    data = r.json()
    assert data["one_m"]["status"] == "available"
    assert data["three_m"]["status"] == "pending"
    assert data["six_m"]["status"] == "pending"
    assert data["three_m"]["days_remaining"] > 0


def test_outcomes_not_executed_returns_404(client, db):
    rec = _seed_recommendation(db)   # executed_amount=None
    r = client.get(f"/api/history/{rec.id}/outcomes")
    assert r.status_code == 404


def test_outcomes_unknown_id_returns_404(client, db):
    r = client.get("/api/history/999/outcomes")
    assert r.status_code == 404
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd backend && python -m pytest tests/test_api.py::test_outcomes_all_available tests/test_api.py::test_outcomes_partial_pending tests/test_api.py::test_outcomes_not_executed_returns_404 tests/test_api.py::test_outcomes_unknown_id_returns_404 -v
```

Expected: 4 × `FAILED` with 404 or 422 (endpoint does not exist yet).

- [ ] **Step 3: Implement the endpoint**

Replace the imports section at the top of `backend/app/routers/history.py` with:

```python
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation
from app.schemas import (
    OutcomeAvailable,
    OutcomePending,
    OutcomeResponse,
    RecommendationRecord,
    RecommendationRecordUpdate,
)
from app.services.market import get_price_at_or_before
```

Append the new route at the end of `backend/app/routers/history.py`:

```python
@router.get("/{rec_id}/outcomes", response_model=OutcomeResponse)
def get_outcomes(rec_id: int, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, rec_id)
    if rec is None or rec.executed_amount is None:
        raise HTTPException(status_code=404, detail="Recommendation not found or not executed")

    today = date.today()
    rec_date = rec.created_at.date()

    def _snapshot(days: int):
        target = rec_date + timedelta(days=days)
        remaining = (target - today).days
        if remaining > 0:
            return OutcomePending(status="pending", days_remaining=remaining)
        future_price = get_price_at_or_before(rec.ticker, target, db)
        if future_price is None:
            return OutcomePending(status="pending", days_remaining=0)
        pct = round(
            (future_price - rec.market_price) / rec.market_price * Decimal("100"),
            2,
        )
        return OutcomeAvailable(status="available", price=future_price, pct=pct)

    return OutcomeResponse(
        one_m=_snapshot(30),
        three_m=_snapshot(90),
        six_m=_snapshot(180),
    )
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd backend && python -m pytest tests/test_api.py::test_outcomes_all_available tests/test_api.py::test_outcomes_partial_pending tests/test_api.py::test_outcomes_not_executed_returns_404 tests/test_api.py::test_outcomes_unknown_id_returns_404 -v
```

Expected: 4 × `PASSED`

- [ ] **Step 5: Run full backend test suite to check for regressions**

```
cd backend && python -m pytest tests/ -v
```

Expected: all pre-existing tests pass (the 4 known yfinance mock failures in `test_generate_recommendation` are pre-existing and unrelated).

- [ ] **Step 6: Commit**

```
git add backend/app/routers/history.py backend/tests/test_api.py
git commit -m "feat(history): add GET /{id}/outcomes endpoint"
```

---

## Task 4: Frontend — API types and `getOutcomes` function

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Add types and function**

Append to `frontend/src/api.ts` (after the existing `markExecuted` function):

```typescript
export type OutcomeSnapshot =
  | { status: 'available'; price: number; pct: number }
  | { status: 'pending'; days_remaining: number }

export interface OutcomeResponse {
  one_m: OutcomeSnapshot
  three_m: OutcomeSnapshot
  six_m: OutcomeSnapshot
}

export function getOutcomes(id: number): Promise<OutcomeResponse> {
  return request(`/api/history/${id}/outcomes`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add frontend/src/api.ts
git commit -m "feat(api): add OutcomeSnapshot, OutcomeResponse types and getOutcomes"
```

---

## Task 5: Frontend — `OutcomePanel` component (TDD)

**Files:**
- Create: `frontend/src/__tests__/OutcomePanel.test.tsx`
- Create: `frontend/src/components/OutcomePanel.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/OutcomePanel.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OutcomePanel } from '../components/OutcomePanel'
import * as api from '../api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OutcomePanel', () => {
  it('shows loading state initially', () => {
    vi.spyOn(api, 'getOutcomes').mockReturnValue(new Promise(() => {}))
    render(<OutcomePanel id={1} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error message when fetch fails', async () => {
    vi.spyOn(api, 'getOutcomes').mockRejectedValue(new Error('network'))
    render(<OutcomePanel id={1} />)
    await waitFor(() =>
      expect(screen.getByText(/could not load outcomes/i)).toBeInTheDocument()
    )
  })

  it('shows green chip for positive available snapshot', async () => {
    vi.spyOn(api, 'getOutcomes').mockResolvedValue({
      one_m: { status: 'available', price: 94.5, pct: 5.0 },
      three_m: { status: 'available', price: 91.8, pct: 2.0 },
      six_m: { status: 'available', price: 99.0, pct: 10.0 },
    })
    render(<OutcomePanel id={1} />)
    await waitFor(() => expect(screen.getByText('+5.0%')).toBeInTheDocument())
    expect(screen.getByText('+5.0%')).toHaveClass('text-green-400')
  })

  it('shows red chip for negative available snapshot', async () => {
    vi.spyOn(api, 'getOutcomes').mockResolvedValue({
      one_m: { status: 'available', price: 85.0, pct: -5.56 },
      three_m: { status: 'available', price: 88.0, pct: -2.22 },
      six_m: { status: 'available', price: 92.0, pct: 2.22 },
    })
    render(<OutcomePanel id={1} />)
    await waitFor(() => expect(screen.getByText('-5.6%')).toBeInTheDocument())
    expect(screen.getByText('-5.6%')).toHaveClass('text-red-400')
  })

  it('shows countdown chip for pending snapshot', async () => {
    vi.spyOn(api, 'getOutcomes').mockResolvedValue({
      one_m: { status: 'available', price: 94.5, pct: 5.0 },
      three_m: { status: 'pending', days_remaining: 30 },
      six_m: { status: 'pending', days_remaining: 120 },
    })
    render(<OutcomePanel id={1} />)
    await waitFor(() => expect(screen.getByText('in 30d')).toBeInTheDocument())
    expect(screen.getByText('in 120d')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd frontend && npx vitest run src/__tests__/OutcomePanel.test.tsx
```

Expected: all 5 tests `FAIL` with module not found error.

- [ ] **Step 3: Implement `OutcomePanel`**

Create `frontend/src/components/OutcomePanel.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { getOutcomes, type OutcomeResponse, type OutcomeSnapshot } from '../api'

interface Props {
  id: number
}

function SnapshotChip({ label, snapshot }: { label: string; snapshot: OutcomeSnapshot }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-ink-muted text-xs font-medium uppercase tracking-wider">{label}</span>
      {snapshot.status === 'available' ? (
        <span
          className={`text-sm font-semibold ${snapshot.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {snapshot.pct >= 0 ? '+' : ''}
          {Number(snapshot.pct).toFixed(1)}%
        </span>
      ) : (
        <span className="text-ink-muted text-sm">
          {snapshot.days_remaining > 0 ? `in ${snapshot.days_remaining}d` : '—'}
        </span>
      )}
    </div>
  )
}

export function OutcomePanel({ id }: Props) {
  const [fetchState, setFetchState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [data, setData] = useState<OutcomeResponse | null>(null)

  useEffect(() => {
    getOutcomes(id)
      .then((res) => {
        setData(res)
        setFetchState('loaded')
      })
      .catch(() => setFetchState('error'))
  }, [id])

  if (fetchState === 'loading') {
    return <p className="text-ink-muted text-xs mt-2">Loading outcomes…</p>
  }
  if (fetchState === 'error') {
    return <p className="text-ink-muted text-xs mt-2">Could not load outcomes</p>
  }
  if (data === null) return null

  return (
    <div className="mt-3 pt-3 border-t border-hairline-soft">
      <div className="flex gap-6">
        <SnapshotChip label="1m" snapshot={data.one_m} />
        <SnapshotChip label="3m" snapshot={data.three_m} />
        <SnapshotChip label="6m" snapshot={data.six_m} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
cd frontend && npx vitest run src/__tests__/OutcomePanel.test.tsx
```

Expected: 5 × `PASS`

- [ ] **Step 5: Commit**

```
git add frontend/src/components/OutcomePanel.tsx frontend/src/__tests__/OutcomePanel.test.tsx
git commit -m "feat(OutcomePanel): add outcome chips component"
```

---

## Task 6: Frontend — expand toggle in `HistoryCardList` (TDD)

**Files:**
- Modify: `frontend/src/__tests__/HistoryCardList.test.tsx`
- Modify: `frontend/src/components/HistoryCardList.tsx`

- [ ] **Step 1: Add `OutcomePanel` mock and three failing tests**

At the top of `frontend/src/__tests__/HistoryCardList.test.tsx`, before the existing `describe` block, add:

```tsx
vi.mock('../components/OutcomePanel', () => ({
  OutcomePanel: ({ id }: { id: number }) => (
    <div data-testid={`outcome-panel-${id}`} />
  ),
}))
```

Then append the following tests inside the existing `describe('HistoryCardList', ...)` block (after the last existing `it`):

```tsx
  it('does not show outcomes toggle for non-executed rows', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /toggle outcomes/i })
    ).not.toBeInTheDocument()
  })

  it('shows outcomes toggle for executed rows', () => {
    render(
      <HistoryCardList
        rows={[{ ...baseRow, executed_amount: 550 }]}
        onMarkExecuted={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', { name: /toggle outcomes/i })
    ).toBeInTheDocument()
  })

  it('renders OutcomePanel when toggle is clicked', async () => {
    render(
      <HistoryCardList
        rows={[{ ...baseRow, executed_amount: 550 }]}
        onMarkExecuted={vi.fn()}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /toggle outcomes/i })
    )
    expect(screen.getByTestId('outcome-panel-1')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to confirm the three new tests fail**

```
cd frontend && npx vitest run src/__tests__/HistoryCardList.test.tsx
```

Expected: existing tests pass, 3 new tests `FAIL`.

- [ ] **Step 3: Implement expand toggle in `HistoryCardList`**

Replace the full contents of `frontend/src/components/HistoryCardList.tsx` with:

```tsx
import { useState } from 'react'
import type { RecommendationRecord } from '../api'
import { OutcomePanel } from './OutcomePanel'

interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}

export function HistoryCardList({ rows, onMarkExecuted }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

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

  function toggleExpanded(id: number) {
    setExpandedId(expandedId === id ? null : id)
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
        const isExpanded = expandedId === row.id

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
            {row.executed_amount !== null && (
              <>
                <button
                  onClick={() => toggleExpanded(row.id)}
                  aria-label="toggle outcomes"
                  className="mt-3 flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                >
                  Outcomes {isExpanded ? '▲' : '▼'}
                </button>
                {isExpanded && <OutcomePanel id={row.id} />}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```
cd frontend && npx vitest run src/__tests__/HistoryCardList.test.tsx
```

Expected: all tests `PASS` (existing + 3 new).

- [ ] **Step 5: Commit**

```
git add frontend/src/components/HistoryCardList.tsx frontend/src/__tests__/HistoryCardList.test.tsx
git commit -m "feat(HistoryCardList): add expand toggle and OutcomePanel for executed rows"
```

---

## Task 7: Frontend — expand toggle in `HistoryTable` (TDD)

**Files:**
- Modify: `frontend/src/__tests__/HistoryTable.test.tsx`
- Modify: `frontend/src/components/HistoryTable.tsx`

- [ ] **Step 1: Add `OutcomePanel` mock and three failing tests**

At the top of `frontend/src/__tests__/HistoryTable.test.tsx`, before the existing `describe` block, add:

```tsx
vi.mock('../components/OutcomePanel', () => ({
  OutcomePanel: ({ id }: { id: number }) => (
    <div data-testid={`outcome-panel-${id}`} />
  ),
}))
```

Append the following tests inside the existing `describe('HistoryTable', ...)` block:

```tsx
  it('does not show outcomes toggle for non-executed rows', () => {
    render(<HistoryTable rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /toggle outcomes/i })
    ).not.toBeInTheDocument()
  })

  it('shows outcomes toggle for executed rows', () => {
    render(
      <HistoryTable
        rows={[{ ...baseRow, executed_amount: 550 }]}
        onMarkExecuted={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', { name: /toggle outcomes/i })
    ).toBeInTheDocument()
  })

  it('renders OutcomePanel when toggle is clicked', async () => {
    render(
      <HistoryTable
        rows={[{ ...baseRow, executed_amount: 550 }]}
        onMarkExecuted={vi.fn()}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /toggle outcomes/i })
    )
    expect(screen.getByTestId('outcome-panel-1')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to confirm the three new tests fail**

```
cd frontend && npx vitest run src/__tests__/HistoryTable.test.tsx
```

Expected: existing tests pass, 3 new tests `FAIL`.

- [ ] **Step 3: Implement expand toggle in `HistoryTable`**

Replace the full contents of `frontend/src/components/HistoryTable.tsx` with:

```tsx
import { Fragment, useState } from 'react'
import type { RecommendationRecord } from '../api'
import { OutcomePanel } from './OutcomePanel'

interface Props {
  rows: RecommendationRecord[]
  onMarkExecuted: (id: number, amount: number) => Promise<void>
}

const HEADERS = ['Date', 'Price', 'Drawdown', 'Multiplier', 'Recommended', 'Executed']

export function HistoryTable({ rows, onMarkExecuted }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

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

  function toggleExpanded(id: number) {
    setExpandedId(expandedId === id ? null : id)
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
            const drawdownPct = `${Number(row.drawdown_pct).toFixed(1)}%`
            const isDeepDrawdown = Number(row.drawdown_pct) < -10
            const isEditing = editingId === row.id
            const isExpanded = expandedId === row.id
            return (
              <Fragment key={row.id}>
                <tr className="border-t border-hairline-soft">
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
                        {row.executed_amount !== null && (
                          <button
                            onClick={() => toggleExpanded(row.id)}
                            aria-label="toggle outcomes"
                            className="text-xs text-ink-muted hover:text-ink"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                {isExpanded && row.executed_amount !== null && (
                  <tr>
                    <td colSpan={6} className="pb-3 px-0">
                      <OutcomePanel id={row.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```
cd frontend && npx vitest run src/__tests__/HistoryTable.test.tsx
```

Expected: all tests `PASS` (existing + 3 new).

- [ ] **Step 5: Run full frontend test suite**

```
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add frontend/src/components/HistoryTable.tsx frontend/src/__tests__/HistoryTable.test.tsx
git commit -m "feat(HistoryTable): add expand toggle and OutcomePanel for executed rows"
```
