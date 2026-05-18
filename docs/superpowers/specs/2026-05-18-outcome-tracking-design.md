# Outcome Tracking — Design Spec

**Date:** 2026-05-18
**Workitem:** WI-20260518-outcomeTracking

---

## Overview

For every executed recommendation (where `executed_amount` is set), show how the entry price performed at three future snapshots: 1 month (+30 days), 3 months (+90 days), and 6 months (+180 days) after the recommendation was created. Each snapshot shows the price and percentage change from the recommendation's `market_price`. Snapshots that haven't elapsed yet show a countdown chip instead.

---

## Scope

- Outcome tracking is shown **only for executed records** (`executed_amount IS NOT NULL`).
- Outcomes appear in an **expandable panel** per history card (mobile) and per history table row (desktop).
- Collapsed by default; expanded on user tap/click.
- No new DB tables or migrations required.

---

## Architecture & Data Flow

```
User expands executed record
        │
        ▼
Frontend calls GET /api/history/{id}/outcomes
        │
        ▼
Backend checks: record exists + has executed_amount (else 404)
        │
        ▼
For each window [1m=30d, 3m=90d, 6m=180d]:
  target_date = created_at.date() + N days
  if target_date > today → {status: "pending", days_remaining: N}
  else → query market_prices for most recent row with date <= target_date
         if no row → {status: "pending", days_remaining: 0}
         else → pct = (future_price - market_price) / market_price * 100
                → {status: "available", price: X, pct: +4.2}
        │
        ▼
Return OutcomeResponse to frontend
        │
        ▼
Panel renders 1m / 3m / 6m chips
```

Price data is sourced from the existing `market_prices` table (already populated with up to 3 years of history per ticker). No yfinance calls at outcome-fetch time.

---

## Backend API

### Endpoint

```
GET /api/history/{id}/outcomes
```

- Returns 404 if the record does not exist or has `executed_amount IS NULL`.
- Read-only; does not call `ensure_prices_fresh`.

### Response Schema

```json
{
  "one_m":   {"status": "available", "price": 94.12, "pct": 4.2},
  "three_m": {"status": "available", "price": 91.80, "pct": 1.7},
  "six_m":   {"status": "pending",   "days_remaining": 23}
}
```

### New Pydantic Schemas (`schemas.py`)

```python
class OutcomeAvailable(BaseModel):
    status: Literal["available"]
    price: Decimal
    pct: Decimal

class OutcomePending(BaseModel):
    status: Literal["pending"]
    days_remaining: int

OutcomeSnapshot = OutcomeAvailable | OutcomePending

class OutcomeResponse(BaseModel):
    one_m: OutcomeSnapshot
    three_m: OutcomeSnapshot
    six_m: OutcomeSnapshot
```

### New Service Function (`market.py`)

```python
def get_price_at_or_before(ticker: str, target_date: date, db: Session) -> Decimal | None
```

Queries `market_prices` for the most recent row with `date <= target_date` for the given ticker. Returns `None` if no row is found.

### Router (`routers/history.py`)

New route added to the existing history router. Computes all three snapshots inline using `get_price_at_or_before`.

---

## Frontend

### API Layer (`api.ts`)

```ts
export type OutcomeSnapshot =
  | { status: 'available'; price: number; pct: number }
  | { status: 'pending'; days_remaining: number }

export interface OutcomeResponse {
  one_m: OutcomeSnapshot
  three_m: OutcomeSnapshot
  six_m: OutcomeSnapshot
}

export function getOutcomes(id: number): Promise<OutcomeResponse>
```

### New Component: `OutcomePanel`

- Props: `{ id: number }`
- Manages its own fetch state: `idle | loading | loaded | error`
- Fetches on first render (called only when panel is expanded)
- Chip rendering:
  - `available` + positive pct → green badge: `+4.2%`
  - `available` + negative pct → red badge: `-1.8%`
  - `pending` → muted grey chip: `in 23 days`
- Layout:

```
┌─────────────────────────────────┐
│ 1m         3m         6m        │
│ +4.2%    -1.8%    in 23 days    │
└─────────────────────────────────┘
```

- On network error: shows a subtle inline message ("Could not load outcomes"), no retry button.

### Changes to `HistoryCardList` and `HistoryTable`

- Add expand toggle (chevron icon) rendered **only** for executed rows (`executed_amount !== null`).
- Collapsed by default. On toggle, render `<OutcomePanel id={row.id} />`.
- Expand state is local (`useState`) — not in the global store.

---

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| No price row for target date | Treat as `pending` (same as time not elapsed) |
| Network error on `getOutcomes` | Inline quiet error in the panel |
| Record has no `executed_amount` | Expand toggle not rendered; endpoint returns 404 if called directly |
| All three windows elapsed, prices available | All chips show colored `available` badges |
| Today's price not in DB | Falls back to most recent available date — acceptable |

---

## Testing

### Backend (`backend/tests/test_api.py`)

| Test | Description |
|---|---|
| `test_outcomes_executed_all_available` | Record 7 months old + prices seeded → all 3 snapshots `available` with correct `pct` |
| `test_outcomes_executed_partial_pending` | Record 2 months old → `1m`/`3m` available, `6m` pending with correct `days_remaining` |
| `test_outcomes_not_executed_returns_404` | `executed_amount` is null → 404 |
| `test_outcomes_record_not_found_returns_404` | Non-existent id → 404 |
| `test_get_price_at_or_before` | Unit test: exact match, nearest-before, no data |

### Frontend

| File | Tests |
|---|---|
| `OutcomePanel.test.tsx` | Loading state, available chips (green/red), pending chip, error state |
| `HistoryCardList.test.tsx` | Toggle visible for executed rows only; `OutcomePanel` renders on expand |
| `HistoryTable.test.tsx` | Same toggle assertions |

---

## Out of Scope

- Configurable lookback window (Settings page)
- Outcome for non-executed records
- Background job to precompute outcomes
- P&L calculation based on `executed_amount`
