# Backend MVP Design — IndexApportationRecommender

**Date:** 2026-05-14
**Workitem:** WI-20260514-backendMVP
**Status:** Approved

---

## 1. Overview

Python/FastAPI backend that fetches daily market prices via yfinance, calculates drawdown against the 12-month high, applies a risk-profile-aware multiplier, and returns a recommended monthly contribution. Single-user, no auth. PostgreSQL via Docker (already provisioned by WI-20260514-dockerInfrastructure).

---

## 2. Repository Layout

```
backend/
  app/
    main.py              # FastAPI app, CORS, lifespan, router mounts
    database.py          # engine, SessionLocal, get_db dependency
    models.py            # all SQLAlchemy models
    schemas.py           # all Pydantic v2 schemas
    services/
      market.py          # yfinance fetch, DB cache, price queries
      recommendation.py  # drawdown calc, multiplier engine, orchestrator
    routers/
      settings.py        # GET/PUT /api/settings
      recommendation.py  # POST /api/recommendation/generate
      history.py         # GET /api/history
      market.py          # GET /api/market/history
  alembic/
    env.py
    versions/
  tests/
    conftest.py          # SQLite in-memory DB, TestClient setup
    test_engine.py       # unit tests — pure recommendation logic
    test_market_service.py  # service tests — cache logic with fixtures
    test_api.py          # API tests — all 5 endpoints via TestClient
  pyproject.toml
  alembic.ini
```

---

## 3. Data Models (`app/models.py`)

### `settings` — single row (id=1), seeded on app startup

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | always 1 |
| base_amount | Numeric(10,2) | e.g. 300.00 |
| min_amount | Numeric(10,2) | floor on recommendation |
| max_amount | Numeric(10,2) | ceiling on recommendation |
| ticker | VARCHAR(20) | default `IWDA.AS` |
| risk_profile | VARCHAR(20) | `conservative` / `balanced` / `aggressive` |

### `market_prices` — daily closes per ticker

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| ticker | VARCHAR(20) | |
| date | Date | |
| close_price | Numeric(12,4) | |
| — | UNIQUE(ticker, date) | prevents duplicate upserts |

### `recommendations` — history log

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| created_at | DateTime | UTC, server default |
| ticker | VARCHAR(20) | |
| market_price | Numeric(12,4) | |
| drawdown | Numeric(8,6) | e.g. -0.123000 |
| drawdown_pct | Numeric(6,2) | e.g. -12.30 |
| multiplier | Numeric(4,2) | |
| rule_triggered | VARCHAR(20) | e.g. `DD_10_20` |
| recommended_amount | Numeric(10,2) | |
| executed_amount | Numeric(10,2) | nullable |
| explanation | Text | human-readable string |

---

## 4. Market Data Service (`app/services/market.py`)

### Cache Strategy

Before any yfinance call, check if a row exists in `market_prices` for `(ticker, today)`. If yes → data is fresh, skip fetch. If no → fetch and upsert. At most one yfinance call per ticker per calendar day.

- **First run (empty table):** download 3 years of history via `yf.download(ticker, period="3y")`.
- **Subsequent runs (today missing):** download last 7 days only, upsert — avoids re-downloading full history.

### Weekend / Holiday Handling

yfinance only returns trading days. "Current price" = most recent `close_price` row ordered by `date DESC LIMIT 1`.

### Public Interface

```python
def ensure_prices_fresh(ticker: str, db: Session) -> None:
    """Fetch from yfinance if today's price is not in DB."""

def get_latest_price(ticker: str, db: Session) -> Decimal:
    """Return the most recent close price."""

def get_price_history(ticker: str, days: int, db: Session) -> list[PricePoint]:
    """Return daily closes for the last N calendar days."""
```

---

## 5. Recommendation Engine (`app/services/recommendation.py`)

### Drawdown Calculation

```
max_12m        = max(close_price) over the last 365 calendar days
drawdown       = (current_price - max_12m) / max_12m
drawdown_pct   = drawdown × 100
```

### Multiplier Tables

Same 4 drawdown thresholds across all profiles; multiplier values scale with risk:

| Drawdown range | Conservative | Balanced | Aggressive | Rule key |
|----------------|-------------|----------|------------|----------|
| 0% to -5% | 1.0× | 1.0× | 1.0× | `DD_0_5` |
| -5% to -10% | 1.1× | 1.2× | 1.5× | `DD_5_10` |
| -10% to -20% | 1.2× | 1.4× | 2.0× | `DD_10_20` |
| < -20% | 1.5× | 1.8× | 2.5× | `DD_GT_20` |

### Clamping

```
recommended_amount = clamp(base_amount × multiplier, min_amount, max_amount)
```

### Output Shape

```python
class RecommendationResult(BaseModel):
    current_price: Decimal
    drawdown: Decimal        # e.g. -0.123
    drawdown_pct: Decimal    # e.g. -12.3
    multiplier: Decimal
    recommended_amount: Decimal
    rule_triggered: str      # e.g. "DD_10_20"
    explanation: str         # "Market is 12.3% below its 12-month high."
```

### Orchestrator (`generate_recommendation`)

1. Call `ensure_prices_fresh(ticker, db)`
2. Fetch last 365 days of prices from DB
3. Call pure `calculate_recommendation(prices, settings)` → result
4. Persist result row to `recommendations` table
5. Return result

The pure `calculate_recommendation` function has no DB access and is the primary unit test target.

---

## 6. API Layer (`app/main.py` + `app/routers/`)

### FastAPI App

- CORS middleware: allow origin `http://localhost:5173` (Vite dev server)
- Lifespan handler: seed `settings` row (id=1) with defaults if not present
- All routers mounted under `/api`
- Migrations: `alembic upgrade head` run as a separate CLI step before starting the server

### Endpoints

| Method | Path | Behaviour |
|--------|------|-----------|
| `POST` | `/api/recommendation/generate` | No request body — reads settings from DB. Runs orchestrator, persists to history, returns `RecommendationResult` |
| `GET` | `/api/settings` | Returns settings row id=1 |
| `PUT` | `/api/settings` | Updates settings row id=1, returns updated row |
| `GET` | `/api/history` | Returns all recommendation rows, `created_at DESC` |
| `GET` | `/api/market/history` | Returns the last 365 calendar days of daily closes for the configured ticker. No query params. |

### DB Session

Injected via `Depends(get_db)` — standard SQLAlchemy session-per-request.

---

## 7. Testing

| Layer | File | Scope |
|-------|------|-------|
| Unit | `tests/test_engine.py` | Pure `calculate_recommendation()`: all drawdown buckets × 3 profiles, clamping edge cases |
| Service | `tests/test_market_service.py` | Cache logic with fixture price list (no yfinance calls) |
| API | `tests/test_api.py` | All 5 endpoints via `TestClient`: happy path + key error cases |

**Test DB:** SQLite in-memory via `DATABASE_URL=sqlite:///:memory:`, injected through FastAPI dependency override. No Docker required to run tests.

**Coverage target:** ≥ 80% on `app/services/` and `app/routers/`.

Live yfinance network calls are excluded from the test suite.

---

## 8. Dependencies (`pyproject.toml`)

```toml
[project]
requires-python = ">=3.12"

dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.30",
  "sqlalchemy>=2.0",
  "alembic>=1.13",
  "pydantic>=2.7",
  "pydantic-settings>=2.3",
  "yfinance>=0.2",
  "psycopg2-binary>=2.9",
]

[project.optional-dependencies]
dev = [
  "pytest>=8",
  "pytest-cov>=5",
  "httpx>=0.27",   # required by TestClient
]
```

---

## 9. Acceptance Criteria

| AC | Criterion |
|----|-----------|
| AC-001 | `POST /api/recommendation/generate` returns `current_price`, `drawdown`, `drawdown_pct`, `multiplier`, `recommended_amount`, `rule_triggered`, `explanation` |
| AC-002 | `GET/PUT /api/settings` reads and persists `base_amount`, `min_amount`, `max_amount`, `ticker`, `risk_profile` |
| AC-003 | `GET /api/history` returns all past recommendations ordered by `created_at DESC` |
| AC-004 | `GET /api/market/history` returns daily close prices for configured ticker |
| AC-005 | Market data is cached in DB and yfinance is called at most once per ticker per day |
| AC-006 | Drawdown = `(current_price − max_12m) / max_12m` |
| AC-007 | Recommended amount is clamped to `[min_amount, max_amount]` |
| AC-008 | All endpoints return correct HTTP status codes and Pydantic-validated responses |
| AC-009 | Alembic migrations run cleanly against the Docker PostgreSQL instance |
