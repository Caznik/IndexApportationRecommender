# Multi-Ticker Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-ticker `Settings` singleton with a per-ticker profile collection, enabling users to maintain separate recommendation profiles for multiple ETFs.

**Architecture:** Add `UNIQUE(ticker)` to the `settings` table (each row = one ticker profile), rewrite the settings router as a collection CRUD, add `ticker` params to recommendation/market endpoints, and update the frontend to manage multiple profiles with a tab-based Dashboard.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend), React/Zustand/TypeScript/Tailwind (frontend), Vitest + React Testing Library (frontend tests), pytest (backend tests)

---

## File Map

**New files:**
- `backend/alembic/versions/0002_per_ticker_settings.py`

**Modified backend:**
- `backend/app/models.py` — add `UniqueConstraint` to Settings
- `backend/app/schemas.py` — split SettingsUpdate (no ticker) / SettingsCreate (with ticker)
- `backend/app/services/recommendation.py` — accept `ticker` param
- `backend/app/routers/settings.py` — full rewrite to collection CRUD
- `backend/app/routers/recommendation.py` — add `ticker` query param
- `backend/app/routers/market.py` — replace Settings DB lookup with `ticker` param
- `backend/app/routers/history.py` — add optional `ticker` filter
- `backend/app/main.py` — seed by ticker, not id
- `backend/tests/test_api.py` — update helpers + all affected tests + new tests

**Modified frontend:**
- `frontend/src/api.ts` — new/updated function signatures
- `frontend/src/store.ts` — multi-ticker state shape
- `frontend/src/pages/Settings.tsx` — full rewrite (profile list)
- `frontend/src/pages/Dashboard.tsx` — ticker tabs, per-ticker data
- `frontend/src/pages/History.tsx` — ticker filter pills
- `frontend/src/__tests__/api.test.ts`
- `frontend/src/__tests__/store.test.ts`
- `frontend/src/__tests__/Settings.test.tsx`
- `frontend/src/__tests__/Dashboard.test.tsx`
- `frontend/src/__tests__/History.test.tsx`

---

## Task 1: Database Migration

**Files:**
- Create: `backend/alembic/versions/0002_per_ticker_settings.py`

- [ ] **Step 1: Create the migration file**

```python
# backend/alembic/versions/0002_per_ticker_settings.py
"""add unique constraint on settings.ticker

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-19
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_settings_ticker", "settings", ["ticker"])


def downgrade() -> None:
    op.drop_constraint("uq_settings_ticker", "settings", type_="unique")
```

- [ ] **Step 2: Apply the migration**

Run from `backend/`:
```
alembic upgrade head
```
Expected output: `Running upgrade 0001 -> 0002, add unique constraint on settings.ticker`

- [ ] **Step 3: Verify in psql that the existing row survives**

```sql
SELECT id, ticker, risk_profile FROM settings;
-- Expected: 1 row, ticker='IWDA.AS'

SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'settings' AND constraint_type = 'UNIQUE';
-- Expected: uq_settings_ticker
```

---

## Task 2: Backend Model + Schemas

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`

- [ ] **Step 1: Add `UniqueConstraint` to the Settings model**

In `backend/app/models.py`, add `UniqueConstraint` to the `sqlalchemy` import and to the `Settings` class:

```python
from sqlalchemy import (
    Integer, String, Numeric, Date, DateTime, Text, UniqueConstraint, func
)

class Settings(Base):
    __tablename__ = "settings"
    __table_args__ = (UniqueConstraint("ticker", name="uq_settings_ticker"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, default="IWDA.AS")
    risk_profile: Mapped[str] = mapped_column(String(20), nullable=False, default="balanced")
```

No other models change.

- [ ] **Step 2: Rewrite `SettingsUpdate` and add `SettingsCreate` in schemas.py**

Replace the existing `SettingsUpdate` class and insert `SettingsCreate` below it. `SettingsRead` stays unchanged.

```python
class SettingsUpdate(BaseModel):
    """PUT body — updates amounts and risk profile. Ticker is the URL key."""
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    risk_profile: Literal["conservative", "balanced", "aggressive"]

    @field_validator("base_amount", "min_amount", "max_amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("must be greater than 0")
        return v

    @model_validator(mode="after")
    def min_lte_max(self) -> "SettingsUpdate":
        if self.min_amount > self.max_amount:
            raise ValueError("min_amount must not exceed max_amount")
        return self


class SettingsCreate(BaseModel):
    """POST body — creates a new ticker profile."""
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    ticker: str
    risk_profile: Literal["conservative", "balanced", "aggressive"]

    @field_validator("base_amount", "min_amount", "max_amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("must be greater than 0")
        return v

    @model_validator(mode="after")
    def min_lte_max(self) -> "SettingsCreate":
        if self.min_amount > self.max_amount:
            raise ValueError("min_amount must not exceed max_amount")
        return self

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("ticker must not be empty")
        return v.strip().upper()
```

- [ ] **Step 3: Verify the app imports are still valid**

Run from `backend/`:
```
python -c "from app.schemas import SettingsRead, SettingsUpdate, SettingsCreate; print('OK')"
```
Expected: `OK`

---

## Task 3: Backend Service — Recommendation

**Files:**
- Modify: `backend/app/services/recommendation.py`

- [ ] **Step 1: Update `generate_recommendation` to accept a `ticker` param**

Replace the function signature and the settings query (lines 76–80 of the original):

```python
def generate_recommendation(db: Session, ticker: str) -> RecommendationResult:
    settings_row = db.execute(
        select(Settings).where(Settings.ticker == ticker)
    ).scalar_one_or_none()
    if settings_row is None:
        raise HTTPException(status_code=404, detail=f"No settings profile for ticker {ticker}")
    settings = SettingsRead.model_validate(settings_row)

    ensure_prices_fresh(settings.ticker, db)
    prices = get_price_history(settings.ticker, 365, db)
    if not prices:
        raise HTTPException(status_code=503, detail="No market data available for ticker")

    result = calculate_recommendation(prices, settings)

    rec = Recommendation(
        created_at=datetime.now(timezone.utc),
        ticker=settings.ticker,
        market_price=result.current_price,
        drawdown=result.drawdown,
        drawdown_pct=result.drawdown_pct,
        multiplier=result.multiplier,
        rule_triggered=result.rule_triggered,
        recommended_amount=result.recommended_amount,
        executed_amount=None,
        explanation=result.explanation,
    )
    db.add(rec)
    db.commit()
    return result
```

`calculate_recommendation` is unchanged.

- [ ] **Step 2: Verify import still works**

```
python -c "from app.services.recommendation import generate_recommendation; print('OK')"
```
Expected: `OK`

---

## Task 4: Rewrite Settings Router

**Files:**
- Modify: `backend/app/routers/settings.py`

- [ ] **Step 1: Rewrite the entire file**

```python
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsCreate, SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=list[SettingsRead])
def list_settings(db: Session = Depends(get_db)):
    rows = db.execute(select(Settings).order_by(Settings.ticker)).scalars().all()
    return rows


@router.post("", response_model=SettingsRead, status_code=201)
def create_settings(body: SettingsCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(Settings).where(Settings.ticker == body.ticker)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Ticker {body.ticker} already exists")
    row = Settings(
        ticker=body.ticker,
        base_amount=body.base_amount,
        min_amount=body.min_amount,
        max_amount=body.max_amount,
        risk_profile=body.risk_profile,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"Ticker {body.ticker} already exists")
    db.refresh(row)
    return row


@router.get("/{ticker}", response_model=SettingsRead)
def get_settings(ticker: str, db: Session = Depends(get_db)):
    row = db.execute(
        select(Settings).where(Settings.ticker == ticker.upper())
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")
    return row


@router.put("/{ticker}", response_model=SettingsRead)
def update_settings(ticker: str, body: SettingsUpdate, db: Session = Depends(get_db)):
    row = db.execute(
        select(Settings).where(Settings.ticker == ticker.upper())
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")
    row.base_amount = body.base_amount
    row.min_amount = body.min_amount
    row.max_amount = body.max_amount
    row.risk_profile = body.risk_profile
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{ticker}", status_code=204)
def delete_settings(ticker: str, db: Session = Depends(get_db)):
    row = db.execute(
        select(Settings).where(Settings.ticker == ticker.upper())
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")
    db.delete(row)
    db.commit()
    return Response(status_code=204)
```

- [ ] **Step 2: Verify syntax**

```
python -c "from app.routers.settings import router; print('OK')"
```
Expected: `OK`

---

## Task 5: Update Remaining Backend Routers

**Files:**
- Modify: `backend/app/routers/recommendation.py`
- Modify: `backend/app/routers/market.py`
- Modify: `backend/app/routers/history.py`

- [ ] **Step 1: Update recommendation router — add `ticker` query param**

Replace the entire file:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RecommendationResult
from app.services.recommendation import generate_recommendation

router = APIRouter(prefix="/api/recommendation", tags=["recommendation"])


@router.post("/generate", response_model=RecommendationResult)
def generate(ticker: str, db: Session = Depends(get_db)):
    return generate_recommendation(db, ticker)
```

- [ ] **Step 2: Update market router — replace Settings DB lookup with `ticker` param**

Replace the entire file:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import PricePoint
from app.services.market import ensure_prices_fresh, get_price_history

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/history", response_model=list[PricePoint])
def market_history(ticker: str, db: Session = Depends(get_db)):
    ensure_prices_fresh(ticker, db)
    return get_price_history(ticker, 365, db)
```

- [ ] **Step 3: Update history router — add optional `ticker` filter**

Change only the `get_history` function (the rest of the file is unchanged):

```python
@router.get("", response_model=list[RecommendationRecord])
def get_history(ticker: str | None = None, db: Session = Depends(get_db)):
    query = select(Recommendation).order_by(Recommendation.created_at.desc())
    if ticker is not None:
        query = query.where(Recommendation.ticker == ticker)
    rows = db.execute(query).scalars().all()
    return rows
```

- [ ] **Step 4: Verify all routers import cleanly**

```
python -c "from app.routers import settings, recommendation, market, history; print('OK')"
```
Expected: `OK`

---

## Task 6: Update `main.py` Lifespan Seed

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Replace the lifespan seed to look up by ticker instead of id**

Replace the lifespan body:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    db: Session = SessionLocal()
    try:
        row = db.execute(
            select(Settings).where(Settings.ticker == "IWDA.AS")
        ).scalar_one_or_none()
        if row is None:
            db.add(Settings(
                base_amount=Decimal("300.00"),
                min_amount=Decimal("100.00"),
                max_amount=Decimal("1000.00"),
                ticker="IWDA.AS",
                risk_profile="balanced",
            ))
            db.commit()
    finally:
        db.close()
    yield
```

Note: `id=1` is removed from the `Settings(...)` constructor so the database autoassigns the primary key.

- [ ] **Step 2: Start the backend and confirm it seeds correctly**

```
uvicorn app.main:app --reload
```
Expected: server starts without error. Visit `http://localhost:8000/api/settings` — should return `[{"id":1,"ticker":"IWDA.AS",...}]` (a JSON array, not an object).

Stop the server with Ctrl+C.

---

## Task 7: Update Backend Tests

**Files:**
- Modify: `backend/tests/test_api.py`

- [ ] **Step 1: Update `_seed_settings` helper to upsert by ticker**

Replace the existing `_seed_settings` function:

```python
def _seed_settings(db, base=300.0, min_=100.0, max_=1000.0, ticker="IWDA.AS", risk="balanced"):
    existing = db.execute(
        select(Settings).where(Settings.ticker == ticker)
    ).scalar_one_or_none()
    if existing is None:
        db.add(Settings(
            base_amount=Decimal(str(base)),
            min_amount=Decimal(str(min_)),
            max_amount=Decimal(str(max_)),
            ticker=ticker,
            risk_profile=risk,
        ))
    else:
        existing.base_amount = Decimal(str(base))
        existing.min_amount = Decimal(str(min_))
        existing.max_amount = Decimal(str(max_))
        existing.risk_profile = risk
    db.commit()
```

- [ ] **Step 2: Update the three settings tests**

Replace `test_get_settings_returns_row`:
```python
def test_get_settings_returns_row(client, db):
    _seed_settings(db)
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["base_amount"] == "300.00"
    assert data[0]["risk_profile"] == "balanced"
```

Replace `test_put_settings_updates_row`:
```python
def test_put_settings_updates_row(client, db):
    _seed_settings(db)
    r = client.put("/api/settings/IWDA.AS", json={
        "base_amount": "500.00",
        "min_amount": "200.00",
        "max_amount": "2000.00",
        "risk_profile": "aggressive",
    })
    assert r.status_code == 200
    assert r.json()["base_amount"] == "500.00"
    assert r.json()["ticker"] == "IWDA.AS"
```

Replace `test_get_settings_returns_seeded_defaults`:
```python
def test_get_settings_returns_seeded_defaults(client):
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    tickers = [row["ticker"] for row in data]
    assert "IWDA.AS" in tickers
```

- [ ] **Step 3: Update the market/recommendation tests to add ticker params**

Replace `test_get_market_history_returns_prices`:
```python
def test_get_market_history_returns_prices(client, db):
    _seed_settings(db)
    _seed_prices(db)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        r = client.get("/api/market/history?ticker=IWDA.AS")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert "date" in data[0]
    assert "close_price" in data[0]
```

Replace `test_generate_recommendation`:
```python
def test_generate_recommendation(client, db):
    _seed_settings(db)
    _seed_prices(db, base_price=100.0)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        r = client.post("/api/recommendation/generate?ticker=IWDA.AS")
    assert r.status_code == 200
    data = r.json()
    assert "current_price" in data
    assert "drawdown" in data
    assert "drawdown_pct" in data
    assert "multiplier" in data
    assert "recommended_amount" in data
    assert "rule_triggered" in data
    assert "explanation" in data
```

Replace `test_generate_recommendation_stored_in_history`:
```python
def test_generate_recommendation_stored_in_history(client, db):
    _seed_settings(db)
    _seed_prices(db)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        client.post("/api/recommendation/generate?ticker=IWDA.AS")
        r = client.get("/api/history")
    assert r.status_code == 200
    assert len(r.json()) == 1
```

- [ ] **Step 4: Add new settings CRUD tests**

Append after `test_get_settings_returns_seeded_defaults`:

```python
def test_post_settings_creates_new_ticker(client, db):
    r = client.post("/api/settings", json={
        "ticker": "VWRA",
        "base_amount": "400.00",
        "min_amount": "150.00",
        "max_amount": "1500.00",
        "risk_profile": "balanced",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["ticker"] == "VWRA"
    assert data["base_amount"] == "400.00"


def test_post_settings_409_on_duplicate_ticker(client, db):
    _seed_settings(db)
    r = client.post("/api/settings", json={
        "ticker": "IWDA.AS",
        "base_amount": "300.00",
        "min_amount": "100.00",
        "max_amount": "1000.00",
        "risk_profile": "balanced",
    })
    assert r.status_code == 409


def test_delete_settings_removes_ticker(client, db):
    client.post("/api/settings", json={
        "ticker": "VWRA",
        "base_amount": "400.00",
        "min_amount": "150.00",
        "max_amount": "1500.00",
        "risk_profile": "balanced",
    })
    r = client.delete("/api/settings/VWRA")
    assert r.status_code == 204
    tickers = [row["ticker"] for row in client.get("/api/settings").json()]
    assert "VWRA" not in tickers


def test_get_history_with_ticker_filter(client, db):
    db.add(Recommendation(
        created_at=datetime.now(timezone.utc),
        ticker="URTH",
        market_price=Decimal("97.40"),
        drawdown=Decimal("-0.082000"),
        drawdown_pct=Decimal("-8.20"),
        multiplier=Decimal("1.20"),
        rule_triggered="-5% band",
        recommended_amount=Decimal("620.00"),
        executed_amount=None,
        explanation="test",
    ))
    db.add(Recommendation(
        created_at=datetime.now(timezone.utc),
        ticker="VWRA",
        market_price=Decimal("100.00"),
        drawdown=Decimal("0.000000"),
        drawdown_pct=Decimal("0.00"),
        multiplier=Decimal("1.00"),
        rule_triggered="DD_0_5",
        recommended_amount=Decimal("300.00"),
        executed_amount=None,
        explanation="test",
    ))
    db.commit()
    r = client.get("/api/history?ticker=URTH")
    assert r.status_code == 200
    data = r.json()
    assert all(row["ticker"] == "URTH" for row in data)
    assert len(data) == 1
```

- [ ] **Step 5: Run all backend tests and confirm they pass**

```
pytest backend/tests/ -v
```
Expected: all tests pass, no failures.

---

## Task 8: Update Frontend API Layer

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Replace all changed function signatures and add new ones**

Replace the entire `api.ts` with:

```typescript
export interface RecommendationResult {
  current_price: number
  drawdown: number
  drawdown_pct: number
  multiplier: number
  recommended_amount: number
  rule_triggered: string
  explanation: string
}

export interface Settings {
  id: number
  base_amount: number
  min_amount: number
  max_amount: number
  ticker: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
}

export interface SettingsUpdate {
  base_amount: number
  min_amount: number
  max_amount: number
  ticker: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
}

export interface RecommendationRecord {
  id: number
  created_at: string
  ticker: string
  market_price: number
  drawdown: number
  drawdown_pct: number
  multiplier: number
  rule_triggered: string
  recommended_amount: number
  executed_amount: number | null
  explanation: string
}

export interface PricePoint {
  date: string
  close_price: number
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = init !== undefined ? await fetch(input, init) : await fetch(input)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export function generateRecommendation(ticker: string): Promise<RecommendationResult> {
  return request(`/api/recommendation/generate?ticker=${encodeURIComponent(ticker)}`, { method: 'POST' })
}

export function getSettings(): Promise<Settings[]> {
  return request('/api/settings')
}

export function createSettings(body: SettingsUpdate): Promise<Settings> {
  return request('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function saveSettings(ticker: string, update: Omit<SettingsUpdate, 'ticker'>): Promise<Settings> {
  return request(`/api/settings/${encodeURIComponent(ticker)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
}

export function deleteSettings(ticker: string): Promise<void> {
  return request(`/api/settings/${encodeURIComponent(ticker)}`, { method: 'DELETE' })
}

export function getHistory(ticker?: string): Promise<RecommendationRecord[]> {
  const qs = ticker ? `?ticker=${encodeURIComponent(ticker)}` : ''
  return request(`/api/history${qs}`)
}

export function getPriceHistory(ticker: string): Promise<PricePoint[]> {
  return request(`/api/market/history?ticker=${encodeURIComponent(ticker)}`)
}

export function markExecuted(id: number, amount: number): Promise<RecommendationRecord> {
  return request(`/api/history/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executed_amount: amount }),
  })
}

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

- [ ] **Step 2: TypeScript check**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors related to `api.ts`. (Other files will have errors until Tasks 9–12 are complete — that's expected.)

---

## Task 9: Update Frontend Store

**Files:**
- Modify: `frontend/src/store.ts`

- [ ] **Step 1: Replace the entire store**

```typescript
import { create } from 'zustand'
import type { RecommendationResult, Settings, SettingsUpdate, RecommendationRecord } from './api'
import * as api from './api'

interface State {
  recommendations: Record<string, RecommendationResult>
  recommendationRestoredAt: Record<string, string | null>
  recommendationLoading: boolean
  recommendationError: string | null
  generate: (ticker: string) => Promise<void>
  restoreRecommendation: (ticker: string) => Promise<void>

  settings: Settings[]
  activeTicker: string | null
  settingsLoading: boolean
  settingsError: string | null
  fetchSettings: () => Promise<void>
  createProfile: (body: SettingsUpdate) => Promise<void>
  saveProfile: (ticker: string, update: Omit<SettingsUpdate, 'ticker'>) => Promise<void>
  deleteProfile: (ticker: string) => Promise<void>
  setActiveTicker: (ticker: string) => void

  history: RecommendationRecord[]
  historyLoading: boolean
  historyError: string | null
  fetchHistory: (ticker?: string) => Promise<void>
  markExecuted: (id: number, amount: number) => Promise<void>
}

export const useStore = create<State>((set, get) => ({
  recommendations: {},
  recommendationRestoredAt: {},
  recommendationLoading: false,
  recommendationError: null,
  generate: async (ticker: string) => {
    set({ recommendationLoading: true, recommendationError: null })
    try {
      const result = await api.generateRecommendation(ticker)
      set((s) => ({
        recommendations: { ...s.recommendations, [ticker]: result },
        recommendationRestoredAt: { ...s.recommendationRestoredAt, [ticker]: null },
        recommendationLoading: false,
      }))
    } catch (e) {
      set({ recommendationLoading: false, recommendationError: (e as Error).message })
    }
  },
  restoreRecommendation: async (ticker: string) => {
    if (get().recommendations[ticker] !== undefined) return
    try {
      const history = await api.getHistory(ticker)
      if (history.length === 0) return
      const latest = history[0]
      set((s) => ({
        recommendations: {
          ...s.recommendations,
          [ticker]: {
            current_price: latest.market_price,
            drawdown: latest.drawdown,
            drawdown_pct: latest.drawdown_pct,
            multiplier: latest.multiplier,
            recommended_amount: latest.recommended_amount,
            rule_triggered: latest.rule_triggered,
            explanation: latest.explanation,
          },
        },
        recommendationRestoredAt: {
          ...s.recommendationRestoredAt,
          [ticker]: latest.created_at,
        },
      }))
    } catch {
      // silent — restoration is best-effort
    }
  },

  settings: [],
  activeTicker: null,
  settingsLoading: false,
  settingsError: null,
  fetchSettings: async () => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await api.getSettings()
      set((s) => ({
        settings,
        settingsLoading: false,
        activeTicker:
          s.activeTicker === null && settings.length > 0
            ? settings[0].ticker
            : s.activeTicker,
      }))
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
    }
  },
  createProfile: async (body: SettingsUpdate) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      await api.createSettings(body)
      const settings = await api.getSettings()
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
      throw e
    }
  },
  saveProfile: async (ticker: string, update: Omit<SettingsUpdate, 'ticker'>) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      await api.saveSettings(ticker, update)
      const settings = await api.getSettings()
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
      throw e
    }
  },
  deleteProfile: async (ticker: string) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      await api.deleteSettings(ticker)
      const settings = await api.getSettings()
      set((s) => ({
        settings,
        settingsLoading: false,
        activeTicker:
          s.activeTicker === ticker
            ? (settings.length > 0 ? settings[0].ticker : null)
            : s.activeTicker,
      }))
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
      throw e
    }
  },
  setActiveTicker: (ticker: string) => set({ activeTicker: ticker }),

  history: [],
  historyLoading: false,
  historyError: null,
  fetchHistory: async (ticker?: string) => {
    set({ historyLoading: true, historyError: null })
    try {
      const history = await api.getHistory(ticker)
      set({ history, historyLoading: false })
    } catch (e) {
      set({ historyLoading: false, historyError: (e as Error).message })
    }
  },
  markExecuted: async (id: number, amount: number) => {
    const updated = await api.markExecuted(id, amount)
    set((s) => ({
      history: s.history.map((r) => (r.id === id ? updated : r)),
    }))
  },
}))
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```
Expected: errors only in pages that haven't been updated yet (Settings.tsx, Dashboard.tsx, History.tsx). No errors in `store.ts` itself.

---

## Task 10: Rewrite Settings Page

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Rewrite the entire component**

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Settings } from '../api'

type RiskProfile = 'conservative' | 'balanced' | 'aggressive'

interface FormValues {
  base_amount: string
  min_amount: string
  max_amount: string
  risk_profile: RiskProfile
  ticker: string
}

const EMPTY_FORM: FormValues = {
  base_amount: '',
  min_amount: '',
  max_amount: '',
  risk_profile: 'balanced',
  ticker: '',
}

function profileToForm(p: Settings): FormValues {
  return {
    base_amount: String(p.base_amount),
    min_amount: String(p.min_amount),
    max_amount: String(p.max_amount),
    risk_profile: p.risk_profile as RiskProfile,
    ticker: p.ticker,
  }
}

function validate(values: FormValues, isNew: boolean): string | null {
  const base = Number(values.base_amount)
  const min = Number(values.min_amount)
  const max = Number(values.max_amount)
  if (!base || base <= 0) return 'Base amount must be greater than 0'
  if (!min || min <= 0) return 'Minimum must be greater than 0'
  if (!max || max <= 0) return 'Maximum must be greater than 0'
  if (min > max) return 'Minimum must not exceed maximum'
  if (isNew && !values.ticker.trim()) return 'Ticker must not be empty'
  return null
}

const FIELDS: { id: keyof FormValues; label: string }[] = [
  { id: 'base_amount', label: 'Base amount (€)' },
  { id: 'min_amount', label: 'Minimum (€)' },
  { id: 'max_amount', label: 'Maximum (€)' },
]

const RISK_OPTIONS: RiskProfile[] = ['conservative', 'balanced', 'aggressive']

export function Settings() {
  const settings = useStore((s) => s.settings)
  const settingsLoading = useStore((s) => s.settingsLoading)
  const settingsError = useStore((s) => s.settingsError)
  const fetchSettings = useStore((s) => s.fetchSettings)
  const createProfile = useStore((s) => s.createProfile)
  const saveProfile = useStore((s) => s.saveProfile)
  const deleteProfile = useStore((s) => s.deleteProfile)

  const [editingTicker, setEditingTicker] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedTicker, setSavedTicker] = useState<string | null>(null)

  useEffect(() => {
    if (settings.length === 0) fetchSettings()
  }, [settings.length, fetchSettings])

  function startEdit(profile: Settings) {
    setEditingTicker(profile.ticker)
    setAdding(false)
    setFormValues(profileToForm(profile))
    setFormError(null)
    setSavedTicker(null)
  }

  function startAdd() {
    setAdding(true)
    setEditingTicker(null)
    setFormValues(EMPTY_FORM)
    setFormError(null)
    setSavedTicker(null)
  }

  function cancelForm() {
    setEditingTicker(null)
    setAdding(false)
    setFormError(null)
  }

  function handleChange(field: keyof FormValues, value: string) {
    setFormValues((v) => ({ ...v, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isNew = adding
    const error = validate(formValues, isNew)
    if (error) { setFormError(error); return }
    setFormError(null)
    const update = {
      base_amount: Number(formValues.base_amount),
      min_amount: Number(formValues.min_amount),
      max_amount: Number(formValues.max_amount),
      risk_profile: formValues.risk_profile,
    }
    try {
      if (editingTicker) {
        await saveProfile(editingTicker, update)
        setSavedTicker(editingTicker)
        setEditingTicker(null)
      } else {
        await createProfile({ ...update, ticker: formValues.ticker })
        setSavedTicker(formValues.ticker)
        setAdding(false)
      }
    } catch {
      // settingsError from store will display the error
    }
  }

  async function handleDelete(ticker: string) {
    await deleteProfile(ticker)
    setConfirmDelete(null)
  }

  const riskBadgeClass: Record<RiskProfile, string> = {
    conservative: 'bg-blue-100 text-blue-700',
    balanced: 'bg-green-100 text-green-700',
    aggressive: 'bg-red-100 text-red-700',
  }

  const isFormOpen = adding || editingTicker !== null

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Ticker Profiles</h1>

      {settingsLoading && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-24 mb-4" />
      )}

      {settingsError && (
        <p className="text-red-500 text-sm mb-4">{settingsError}</p>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {settings.map((profile) => (
          <div key={profile.ticker} className="bg-surface-1 rounded-xl p-5">
            {editingTicker === profile.ticker ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{profile.ticker}</span>
                  <span className="text-ink-muted text-xs">(ticker cannot be changed)</span>
                </div>
                {FIELDS.map(({ id, label }) => (
                  <div key={id} className="flex flex-col gap-1">
                    <label htmlFor={`edit-${id}`} className="text-sm text-ink-muted">{label}</label>
                    <input
                      id={`edit-${id}`}
                      type="number"
                      value={formValues[id] as string}
                      onChange={(e) => handleChange(id, e.target.value)}
                      className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                      aria-label={label}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-risk" className="text-sm text-ink-muted">Risk profile</label>
                  <select
                    id="edit-risk"
                    value={formValues.risk_profile}
                    onChange={(e) => handleChange('risk_profile', e.target.value)}
                    className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {RISK_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {formError && <p className="text-red-500 text-xs">{formError}</p>}
                <div className="flex gap-2 mt-1">
                  <button type="submit" className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium">
                    Save
                  </button>
                  <button type="button" onClick={cancelForm} className="text-sm text-ink-muted px-2">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{profile.ticker}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${riskBadgeClass[profile.risk_profile as RiskProfile]}`}>
                      {profile.risk_profile}
                    </span>
                    {savedTicker === profile.ticker && (
                      <span className="text-green-600 text-xs">Saved</span>
                    )}
                  </div>
                  <p className="text-ink-muted text-sm">
                    €{Number(profile.base_amount).toFixed(0)} base · €{Number(profile.min_amount).toFixed(0)}–€{Number(profile.max_amount).toFixed(0)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(profile)}
                    className="text-sm text-ink-muted hover:text-ink px-2 py-1"
                    aria-label={`Edit ${profile.ticker}`}
                  >
                    Edit
                  </button>
                  {confirmDelete === profile.ticker ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-ink-muted">Delete {profile.ticker}?</span>
                      <button
                        onClick={() => handleDelete(profile.ticker)}
                        className="text-xs text-red-600 hover:text-red-700 px-1"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-ink-muted px-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(profile.ticker)}
                      className="text-sm text-ink-muted hover:text-red-500 px-2 py-1"
                      aria-label={`Delete ${profile.ticker}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-surface-1 rounded-xl p-5 mb-4">
          <h2 className="font-semibold mb-3">Add Ticker</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="add-ticker" className="text-sm text-ink-muted">Ticker</label>
              <input
                id="add-ticker"
                type="text"
                value={formValues.ticker}
                onChange={(e) => handleChange('ticker', e.target.value)}
                className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                placeholder="e.g. VWRA"
                aria-label="Ticker"
              />
            </div>
            {FIELDS.map(({ id, label }) => (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={`add-${id}`} className="text-sm text-ink-muted">{label}</label>
                <input
                  id={`add-${id}`}
                  type="number"
                  value={formValues[id] as string}
                  onChange={(e) => handleChange(id, e.target.value)}
                  className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                  aria-label={label}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label htmlFor="add-risk" className="text-sm text-ink-muted">Risk profile</label>
              <select
                id="add-risk"
                value={formValues.risk_profile}
                onChange={(e) => handleChange('risk_profile', e.target.value)}
                className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {formError && <p className="text-red-500 text-xs">{formError}</p>}
            <div className="flex gap-2 mt-1">
              <button type="submit" className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium">
                Add
              </button>
              <button type="button" onClick={cancelForm} className="text-sm text-ink-muted px-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        !isFormOpen && (
          <button
            onClick={startAdd}
            className="w-full bg-surface-1 hover:bg-surface-2 rounded-xl px-5 py-4 text-sm text-ink-muted text-left transition-colors"
          >
            + Add ticker
          </button>
        )
      )}
    </div>
  )
}
```

---

## Task 11: Update Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Rewrite the component**

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getPriceHistory } from '../api'
import type { PricePoint } from '../api'
import { HeroCard } from '../components/HeroCard'
import { StatCard } from '../components/StatCard'
import { PriceChart } from '../components/PriceChart'
import { computePriceChanges } from '../utils/priceChanges'

export function Dashboard() {
  const recommendations = useStore((s) => s.recommendations)
  const recommendationRestoredAt = useStore((s) => s.recommendationRestoredAt)
  const recommendationLoading = useStore((s) => s.recommendationLoading)
  const recommendationError = useStore((s) => s.recommendationError)
  const generate = useStore((s) => s.generate)
  const settings = useStore((s) => s.settings)
  const activeTicker = useStore((s) => s.activeTicker)
  const setActiveTicker = useStore((s) => s.setActiveTicker)
  const fetchSettings = useStore((s) => s.fetchSettings)
  const restoreRecommendation = useStore((s) => s.restoreRecommendation)

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [priceHistoryError, setPriceHistoryError] = useState(false)

  const recommendation = activeTicker ? (recommendations[activeTicker] ?? null) : null
  const activeProfile = settings.find((s) => s.ticker === activeTicker) ?? null
  const restoredAt = activeTicker ? (recommendationRestoredAt[activeTicker] ?? null) : null

  useEffect(() => {
    if (settings.length === 0) fetchSettings()
  }, [settings.length, fetchSettings])

  useEffect(() => {
    if (!activeTicker) return
    if (recommendations[activeTicker] === undefined) {
      restoreRecommendation(activeTicker)
    }
  }, [activeTicker, recommendations, restoreRecommendation])

  useEffect(() => {
    if (!activeTicker) return
    setChartLoading(true)
    setPriceHistoryError(false)
    getPriceHistory(activeTicker)
      .then(setPriceHistory)
      .catch(() => setPriceHistoryError(true))
      .finally(() => setChartLoading(false))
  }, [activeTicker])

  const { pctDay, pctMonth } = computePriceChanges(priceHistory)

  const statCards = [
    {
      label: 'Current Price',
      value: recommendation ? `$${Number(recommendation.current_price).toFixed(2)}` : null,
    },
    {
      label: '12m High',
      value:
        recommendation && activeProfile
          ? `$${(Number(recommendation.current_price) / (1 + Number(recommendation.drawdown))).toFixed(2)}`
          : null,
    },
    {
      label: 'Base Amount',
      value: activeProfile ? `€${Number(activeProfile.base_amount).toFixed(0)}` : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {settings.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {settings.map((s) => (
            <button
              key={s.ticker}
              onClick={() => setActiveTicker(s.ticker)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTicker === s.ticker
                  ? 'bg-surface-3 text-ink'
                  : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
              }`}
            >
              {s.ticker}
            </button>
          ))}
        </div>
      )}

      <HeroCard
        result={recommendation}
        baseAmount={activeProfile ? Number(activeProfile.base_amount) : null}
        loading={recommendationLoading}
        error={recommendationError}
        onGenerate={() => activeTicker && generate(activeTicker)}
        pctDay={pctDay}
        pctMonth={pctMonth}
        priceHistoryError={priceHistoryError}
        restoredAt={restoredAt}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <PriceChart data={priceHistory} loading={chartLoading} />
    </div>
  )
}
```

---

## Task 12: Update History Page

**Files:**
- Modify: `frontend/src/pages/History.tsx`

- [ ] **Step 1: Add ticker filter pills to the History component**

Replace the entire file:

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'
import { HistoryCardList } from '../components/HistoryCardList'
import { ContributionCalendar } from '../components/ContributionCalendar'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const settings = useStore((s) => s.settings)
  const markExecuted = useStore((s) => s.markExecuted)
  const [hasFetched, setHasFetched] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [tableOpen, setTableOpen] = useState(true)
  const [filterTicker, setFilterTicker] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory().finally(() => setHasFetched(true))
  }, [fetchHistory])

  async function handleFilterChange(ticker: string | null) {
    setFilterTicker(ticker)
    await fetchHistory(ticker ?? undefined)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">History</h1>

      {settings.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => handleFilterChange(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterTicker === null ? 'bg-surface-3 text-ink' : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
            }`}
          >
            All
          </button>
          {settings.map((s) => (
            <button
              key={s.ticker}
              onClick={() => handleFilterChange(s.ticker)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterTicker === s.ticker ? 'bg-surface-3 text-ink' : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
              }`}
            >
              {s.ticker}
            </button>
          ))}
        </div>
      )}

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
        <div className="flex flex-col gap-3">
          <div className="bg-surface-1 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setCalendarOpen(o => !o)}
              aria-expanded={calendarOpen}
            >
              <span className="text-sm font-semibold">Contribution Calendar</span>
              <ChevronIcon open={calendarOpen} />
            </button>
            {calendarOpen && (
              <div className="px-6 pb-6">
                <ContributionCalendar rows={history} />
              </div>
            )}
          </div>

          <div className="bg-surface-1 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setTableOpen(o => !o)}
              aria-expanded={tableOpen}
            >
              <span className="text-sm font-semibold">History Table</span>
              <ChevronIcon open={tableOpen} />
            </button>
            {tableOpen && (
              <div className="px-6 pb-6">
                <div className="block sm:hidden">
                  <HistoryCardList rows={history} onMarkExecuted={markExecuted} />
                </div>
                <div className="hidden sm:block">
                  <HistoryTable rows={history} onMarkExecuted={markExecuted} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Task 13: Update Frontend Tests

**Files:**
- Modify: `frontend/src/__tests__/api.test.ts`
- Modify: `frontend/src/__tests__/store.test.ts`
- Modify: `frontend/src/__tests__/Settings.test.tsx`
- Modify: `frontend/src/__tests__/Dashboard.test.tsx`
- Modify: `frontend/src/__tests__/History.test.tsx`

- [ ] **Step 1: Rewrite `api.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockError(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ detail: 'error' }),
  } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('generateRecommendation', () => {
  it('POSTs to /api/recommendation/generate with ticker param', async () => {
    mockFetch.mockReturnValue(mockOk({ current_price: 97.4, recommended_amount: 620 }))
    const result = await api.generateRecommendation('IWDA.AS')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/recommendation/generate?ticker=IWDA.AS',
      { method: 'POST' }
    )
    expect(result.recommended_amount).toBe(620)
  })

  it('throws on non-2xx', async () => {
    mockFetch.mockReturnValue(mockError(503))
    await expect(api.generateRecommendation('IWDA.AS')).rejects.toThrow('HTTP 503')
  })
})

describe('getSettings', () => {
  it('GETs /api/settings and returns array', async () => {
    mockFetch.mockReturnValue(mockOk([{ id: 1, base_amount: 500, ticker: 'IWDA.AS' }]))
    const result = await api.getSettings()
    expect(mockFetch).toHaveBeenCalledWith('/api/settings')
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('createSettings', () => {
  it('POSTs /api/settings with JSON body', async () => {
    const body = { base_amount: 400, min_amount: 150, max_amount: 1500, ticker: 'VWRA', risk_profile: 'balanced' as const }
    mockFetch.mockReturnValue(mockOk({ ...body, id: 2 }))
    await api.createSettings(body)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
})

describe('saveSettings', () => {
  it('PUTs /api/settings/{ticker} with body excluding ticker', async () => {
    const update = { base_amount: 500, min_amount: 100, max_amount: 1000, risk_profile: 'balanced' as const }
    mockFetch.mockReturnValue(mockOk({ ...update, id: 1, ticker: 'URTH' }))
    await api.saveSettings('URTH', update)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/URTH', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
  })
})

describe('deleteSettings', () => {
  it('DELETEs /api/settings/{ticker}', async () => {
    mockFetch.mockReturnValue(mockOk(undefined))
    await api.deleteSettings('VWRA')
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/VWRA', { method: 'DELETE' })
  })
})

describe('getHistory', () => {
  it('GETs /api/history without filter', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getHistory()
    expect(mockFetch).toHaveBeenCalledWith('/api/history')
  })

  it('GETs /api/history?ticker=URTH when ticker provided', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getHistory('URTH')
    expect(mockFetch).toHaveBeenCalledWith('/api/history?ticker=URTH')
  })
})

describe('getPriceHistory', () => {
  it('GETs /api/market/history with ticker param', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getPriceHistory('IWDA.AS')
    expect(mockFetch).toHaveBeenCalledWith('/api/market/history?ticker=IWDA.AS')
  })
})
```

- [ ] **Step 2: Rewrite `store.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationResult, RecommendationRecord, Settings } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const INITIAL: Partial<ReturnType<typeof useStore.getState>> = {
  recommendations: {},
  recommendationRestoredAt: {},
  recommendationLoading: false,
  recommendationError: null,
  settings: [],
  activeTicker: null,
  settingsLoading: false,
  settingsError: null,
  history: [],
  historyLoading: false,
  historyError: null,
}

const mockResult: RecommendationResult = {
  current_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 620,
  explanation: '',
}

const mockRecord: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-14T12:00:00',
  ticker: 'URTH',
  market_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 620,
  executed_amount: null,
  explanation: '',
}

const mockSettings: Settings = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

beforeEach(() => {
  useStore.setState(INITIAL)
  vi.clearAllMocks()
})

describe('generate', () => {
  it('stores result keyed by ticker on success', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    await useStore.getState().generate('IWDA.AS')
    expect(useStore.getState().recommendations['IWDA.AS']).toEqual(mockResult)
    expect(useStore.getState().recommendationLoading).toBe(false)
    expect(useStore.getState().recommendationRestoredAt['IWDA.AS']).toBeNull()
  })

  it('calls generateRecommendation with the given ticker', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    await useStore.getState().generate('VWRA')
    expect(mockApi.generateRecommendation).toHaveBeenCalledWith('VWRA')
  })

  it('sets recommendationError on failure', async () => {
    mockApi.generateRecommendation.mockRejectedValue(new Error('HTTP 503'))
    await useStore.getState().generate('IWDA.AS')
    expect(useStore.getState().recommendationError).toBe('HTTP 503')
    expect(useStore.getState().recommendations['IWDA.AS']).toBeUndefined()
  })
})

describe('fetchSettings', () => {
  it('sets settings array and activeTicker on success', async () => {
    mockApi.getSettings.mockResolvedValue([mockSettings])
    await useStore.getState().fetchSettings()
    expect(useStore.getState().settings).toEqual([mockSettings])
    expect(useStore.getState().activeTicker).toBe('URTH')
  })

  it('does not overwrite activeTicker when already set', async () => {
    useStore.setState({ activeTicker: 'VWRA' })
    mockApi.getSettings.mockResolvedValue([mockSettings])
    await useStore.getState().fetchSettings()
    expect(useStore.getState().activeTicker).toBe('VWRA')
  })
})

describe('setActiveTicker', () => {
  it('updates activeTicker', () => {
    useStore.getState().setActiveTicker('VWRA')
    expect(useStore.getState().activeTicker).toBe('VWRA')
  })
})

describe('createProfile', () => {
  it('calls createSettings and re-fetches list', async () => {
    const body = { base_amount: 400, min_amount: 100, max_amount: 1500, ticker: 'VWRA', risk_profile: 'balanced' as const }
    mockApi.createSettings.mockResolvedValue({ ...body, id: 2 })
    mockApi.getSettings.mockResolvedValue([mockSettings, { ...body, id: 2 }])
    await useStore.getState().createProfile(body)
    expect(mockApi.createSettings).toHaveBeenCalledWith(body)
    expect(useStore.getState().settings).toHaveLength(2)
  })
})

describe('saveProfile', () => {
  it('calls saveSettings with ticker and update, then re-fetches', async () => {
    const update = { base_amount: 600, min_amount: 100, max_amount: 1200, risk_profile: 'aggressive' as const }
    mockApi.saveSettings.mockResolvedValue({ ...mockSettings, ...update })
    mockApi.getSettings.mockResolvedValue([{ ...mockSettings, ...update }])
    await useStore.getState().saveProfile('URTH', update)
    expect(mockApi.saveSettings).toHaveBeenCalledWith('URTH', update)
    expect(useStore.getState().settings[0].base_amount).toBe(600)
  })
})

describe('deleteProfile', () => {
  it('calls deleteSettings and removes ticker from list', async () => {
    useStore.setState({ settings: [mockSettings], activeTicker: 'URTH' })
    mockApi.deleteSettings.mockResolvedValue(undefined)
    mockApi.getSettings.mockResolvedValue([])
    await useStore.getState().deleteProfile('URTH')
    expect(mockApi.deleteSettings).toHaveBeenCalledWith('URTH')
    expect(useStore.getState().settings).toHaveLength(0)
    expect(useStore.getState().activeTicker).toBeNull()
  })
})

describe('fetchHistory', () => {
  it('sets history rows on success', async () => {
    const rows = [mockRecord]
    mockApi.getHistory.mockResolvedValue(rows)
    await useStore.getState().fetchHistory()
    expect(useStore.getState().history).toEqual(rows)
  })

  it('passes ticker filter to getHistory', async () => {
    mockApi.getHistory.mockResolvedValue([])
    await useStore.getState().fetchHistory('URTH')
    expect(mockApi.getHistory).toHaveBeenCalledWith('URTH')
  })
})

describe('restoreRecommendation', () => {
  it('does nothing when recommendation for ticker already set', async () => {
    useStore.setState({ recommendations: { 'URTH': mockResult } })
    await useStore.getState().restoreRecommendation('URTH')
    expect(mockApi.getHistory).not.toHaveBeenCalled()
  })

  it('does nothing when history is empty', async () => {
    mockApi.getHistory.mockResolvedValue([])
    await useStore.getState().restoreRecommendation('URTH')
    expect(useStore.getState().recommendations['URTH']).toBeUndefined()
  })

  it('restores recommendation from history[0] for the given ticker', async () => {
    mockApi.getHistory.mockResolvedValue([mockRecord])
    await useStore.getState().restoreRecommendation('URTH')
    expect(useStore.getState().recommendations['URTH']).toEqual({
      current_price: mockRecord.market_price,
      drawdown: mockRecord.drawdown,
      drawdown_pct: mockRecord.drawdown_pct,
      multiplier: mockRecord.multiplier,
      recommended_amount: mockRecord.recommended_amount,
      rule_triggered: mockRecord.rule_triggered,
      explanation: mockRecord.explanation,
    })
    expect(useStore.getState().recommendationRestoredAt['URTH']).toBe(mockRecord.created_at)
  })

  it('is silent on getHistory failure', async () => {
    mockApi.getHistory.mockRejectedValue(new Error('network error'))
    await useStore.getState().restoreRecommendation('URTH')
    expect(useStore.getState().recommendations['URTH']).toBeUndefined()
    expect(useStore.getState().recommendationError).toBeNull()
  })
})

describe('markExecuted', () => {
  const updatedRecord: RecommendationRecord = { ...mockRecord, executed_amount: 600 }
  const other: RecommendationRecord = { ...mockRecord, id: 2 }

  it('replaces matching record in history on success', async () => {
    useStore.setState({ history: [mockRecord, other] })
    mockApi.markExecuted.mockResolvedValue(updatedRecord)
    await useStore.getState().markExecuted(1, 600)
    expect(useStore.getState().history[0]).toEqual(updatedRecord)
    expect(useStore.getState().history[1]).toEqual(other)
  })

  it('propagates error and leaves history unchanged on failure', async () => {
    useStore.setState({ history: [mockRecord] })
    mockApi.markExecuted.mockRejectedValue(new Error('HTTP 500'))
    await expect(useStore.getState().markExecuted(1, 600)).rejects.toThrow('HTTP 500')
    expect(useStore.getState().history[0]).toEqual(mockRecord)
  })
})
```

- [ ] **Step 3: Rewrite `Settings.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../pages/Settings'
import { useStore } from '../store'
import * as api from '../api'
import type { Settings as SettingsType } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const mockProfile: SettingsType = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

beforeEach(() => {
  useStore.setState({
    settings: [mockProfile],
    activeTicker: 'URTH',
    settingsLoading: false,
    settingsError: null,
    recommendations: {},
    recommendationRestoredAt: {},
    recommendationLoading: false,
    recommendationError: null,
    history: [],
    historyLoading: false,
    historyError: null,
  })
  vi.clearAllMocks()
  mockApi.saveSettings.mockResolvedValue(mockProfile)
  mockApi.getSettings.mockResolvedValue([mockProfile])
  mockApi.createSettings.mockResolvedValue(mockProfile)
  mockApi.deleteSettings.mockResolvedValue(undefined)
})

describe('Settings', () => {
  it('renders ticker profile card with values from store', () => {
    render(<Settings />)
    expect(screen.getByText('URTH')).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('clicking Edit populates form with profile values', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('Edit form shows ticker as read-only', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    expect(screen.getByText(/ticker cannot be changed/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /ticker/i })).not.toBeInTheDocument()
  })

  it('submitting Edit form calls saveProfile with ticker and update', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockApi.saveSettings).toHaveBeenCalledWith('URTH', {
        base_amount: 500,
        min_amount: 100,
        max_amount: 1000,
        risk_profile: 'balanced',
      })
    })
  })

  it('shows validation error when min > max in Edit form', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    const minInput = screen.getByLabelText(/minimum/i)
    await userEvent.clear(minInput)
    await userEvent.type(minInput, '2000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/minimum must not exceed maximum/i)).toBeInTheDocument()
    expect(mockApi.saveSettings).not.toHaveBeenCalled()
  })

  it('clicking Add Ticker opens add form', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByText(/\+ add ticker/i))
    expect(screen.getByLabelText(/ticker/i)).toBeInTheDocument()
  })

  it('submitting Add form calls createProfile', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByText(/\+ add ticker/i))
    await userEvent.type(screen.getByLabelText('Ticker'), 'VWRA')
    const baseInputs = screen.getAllByLabelText(/base amount/i)
    await userEvent.type(baseInputs[baseInputs.length - 1], '400')
    const minInputs = screen.getAllByLabelText(/minimum/i)
    await userEvent.type(minInputs[minInputs.length - 1], '100')
    const maxInputs = screen.getAllByLabelText(/maximum/i)
    await userEvent.type(maxInputs[maxInputs.length - 1], '1000')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => expect(mockApi.createSettings).toHaveBeenCalled())
  })

  it('clicking Delete shows confirmation', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /delete urth/i }))
    expect(screen.getByText(/delete urth\?/i)).toBeInTheDocument()
  })

  it('confirming delete calls deleteProfile', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /delete urth/i }))
    await userEvent.click(screen.getByRole('button', { name: /^yes$/i }))
    await waitFor(() => expect(mockApi.deleteSettings).toHaveBeenCalledWith('URTH'))
  })
})
```

- [ ] **Step 4: Update `Dashboard.test.tsx`**

Replace the `mockSettings` constant and the `beforeEach` state, then update the two affected test assertions:

Replace `const mockSettings: Settings = {...}` with:
```tsx
const mockSettings: Settings = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}
```

Replace the `beforeEach` block:
```tsx
beforeEach(() => {
  useStore.setState({
    recommendations: {},
    recommendationRestoredAt: {},
    recommendationLoading: false,
    recommendationError: null,
    settings: [mockSettings],
    activeTicker: 'URTH',
    settingsLoading: false,
    settingsError: null,
    history: [],
    historyLoading: false,
    historyError: null,
  })
  vi.clearAllMocks()
  mockApi.getPriceHistory.mockResolvedValue([])
  mockApi.getSettings.mockResolvedValue([mockSettings])
  mockApi.getHistory.mockResolvedValue([])
})
```

Update `'calls POST /api/recommendation/generate when Generate clicked'`:
```tsx
it('calls POST /api/recommendation/generate when Generate clicked', async () => {
  mockApi.generateRecommendation.mockResolvedValue(mockResult)
  render(<Dashboard />)
  await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
  await waitFor(() => expect(mockApi.generateRecommendation).toHaveBeenCalledWith('URTH'))
})
```

Update `'displays 1d price change badge...'` — `getPriceHistory` is now called with ticker:
```tsx
it('displays 1d price change badge from priceHistory without requiring generate', async () => {
  useStore.setState({ recommendations: { 'URTH': mockResult } })
  mockApi.getPriceHistory.mockResolvedValue([
    { date: '2026-05-15', close_price: 100 },
    { date: '2026-05-16', close_price: 102 },
  ])
  render(<Dashboard />)
  await waitFor(() => {
    expect(screen.getByText('+2.0%')).toBeInTheDocument()
  })
})
```

Add one new test at the end of the `describe('Dashboard')` block:
```tsx
it('shows ticker tab bar when multiple profiles exist', () => {
  const secondProfile: Settings = { id: 2, base_amount: 300, min_amount: 100, max_amount: 800, ticker: 'VWRA', risk_profile: 'conservative' }
  useStore.setState({ settings: [mockSettings, secondProfile], activeTicker: 'URTH' })
  render(<Dashboard />)
  expect(screen.getByRole('button', { name: 'URTH' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'VWRA' })).toBeInTheDocument()
})
```

Update the two restore-related tests to use the new store shape:
```tsx
it('restores recommendation on mount when history exists', async () => {
  mockApi.getHistory.mockResolvedValue([mockRecord])
  render(<Dashboard />)
  await waitFor(() => expect(screen.getByText('€620')).toBeInTheDocument())
})

it('shows age label when recommendation is restored from history', async () => {
  mockApi.getHistory.mockResolvedValue([mockRecord])
  render(<Dashboard />)
  await waitFor(() => expect(screen.getByText(/generated may/i)).toBeInTheDocument())
})

it('shows empty state when history is empty on mount', async () => {
  mockApi.getHistory.mockResolvedValue([])
  render(<Dashboard />)
  await waitFor(() =>
    expect(screen.getByText('No recommendation yet')).toBeInTheDocument()
  )
})
```

- [ ] **Step 5: Update `History.test.tsx`**

Replace the `beforeEach` block to include `settings`:
```tsx
beforeEach(() => {
  useStore.setState({
    history: [],
    historyLoading: false,
    historyError: null,
    settings: [],
    activeTicker: null,
    recommendations: {},
    recommendationRestoredAt: {},
    recommendationLoading: false,
    recommendationError: null,
    settingsLoading: false,
    settingsError: null,
  })
  vi.clearAllMocks()
})
```

Add two new tests at the end of the `describe('History')` block:
```tsx
it('shows ticker filter pills when settings has profiles', async () => {
  const profile = { id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
  useStore.setState({ settings: [profile] })
  mockApi.getHistory.mockResolvedValue([])
  render(<History />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^urth$/i })).toBeInTheDocument()
  })
})

it('clicking a ticker pill calls fetchHistory with that ticker', async () => {
  const profile = { id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
  useStore.setState({ settings: [profile] })
  mockApi.getHistory.mockResolvedValue([])
  render(<History />)
  await waitFor(() => screen.getByRole('button', { name: /^urth$/i }))
  await userEvent.click(screen.getByRole('button', { name: /^urth$/i }))
  await waitFor(() => expect(mockApi.getHistory).toHaveBeenCalledWith('URTH'))
})
```

- [ ] **Step 6: Run all frontend tests and confirm they pass**

```
cd frontend && npm test -- --run
```
Expected: all tests pass, no failures.

---

## Task 14: TypeScript Check + Full Verification

- [ ] **Step 1: TypeScript strict check across entire frontend**

```
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 2: Run backend test suite one final time**

```
pytest backend/tests/ -v
```
Expected: all pass.

- [ ] **Step 3: Run frontend test suite one final time**

```
cd frontend && npm test -- --run
```
Expected: all pass.

- [ ] **Step 4: Smoke test via Swagger UI**

Start the backend: `uvicorn app.main:app --reload`

Exercise in order at `http://localhost:8000/docs`:
1. `GET /api/settings` → `[{"id":1,"ticker":"IWDA.AS",...}]`
2. `POST /api/settings` body `{"ticker":"VWRA","base_amount":"400","min_amount":"150","max_amount":"1500","risk_profile":"balanced"}` → 201
3. `GET /api/settings` → two entries
4. `PUT /api/settings/VWRA` body `{"base_amount":"450","min_amount":"150","max_amount":"1500","risk_profile":"aggressive"}` → 200, base_amount=450
5. `POST /api/recommendation/generate?ticker=VWRA` → 200 (needs market data, may return 503 in dev — that's expected)
6. `GET /api/history?ticker=VWRA` → filtered list
7. `DELETE /api/settings/VWRA` → 204
8. `POST /api/settings` with `ticker=IWDA.AS` again → 409

- [ ] **Step 5: E2E verification in browser**

Start both servers. Navigate to Settings — confirm profile cards render with Edit/Delete. Add VWRA profile — confirm it appears. Go to Dashboard — confirm tab bar shows IWDA.AS and VWRA. Switch tabs — confirm recommendation area updates. Go to History — confirm filter pills appear for both tickers.
