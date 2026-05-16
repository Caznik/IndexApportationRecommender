# Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI backend that fetches market prices via yfinance, calculates drawdown, and recommends a monthly contribution amount based on risk profile.

**Architecture:** Layered flat modules under `backend/app/` — models, schemas, services (market + recommendation), routers (settings, recommendation, history, market). Pure business logic in services with no DB access for easy unit testing. PostgreSQL via Docker; SQLite in-memory for tests.

**Tech Stack:** Python 3.12, FastAPI 0.115+, SQLAlchemy 2.x, Alembic, Pydantic v2, yfinance, psycopg2-binary, pytest, uv

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/pyproject.toml` | Create | Package metadata, dependencies |
| `backend/alembic.ini` | Create | Alembic config pointing to `DATABASE_URL` |
| `backend/alembic/env.py` | Create | Alembic env wired to SQLAlchemy models |
| `backend/alembic/versions/0001_initial.py` | Create | Initial migration: settings, market_prices, recommendations |
| `backend/app/__init__.py` | Create | Empty |
| `backend/app/database.py` | Create | Engine, SessionLocal, `get_db` dependency |
| `backend/app/models.py` | Create | Settings, MarketPrice, Recommendation ORM models |
| `backend/app/schemas.py` | Create | All Pydantic v2 request/response schemas |
| `backend/app/services/__init__.py` | Create | Empty |
| `backend/app/services/market.py` | Create | `ensure_prices_fresh`, `get_latest_price`, `get_price_history` |
| `backend/app/services/recommendation.py` | Create | `calculate_recommendation` (pure), `generate_recommendation` (orchestrator) |
| `backend/app/routers/__init__.py` | Create | Empty |
| `backend/app/routers/settings.py` | Create | GET/PUT `/api/settings` |
| `backend/app/routers/recommendation.py` | Create | POST `/api/recommendation/generate` |
| `backend/app/routers/history.py` | Create | GET `/api/history` |
| `backend/app/routers/market.py` | Create | GET `/api/market/history` |
| `backend/app/main.py` | Create | FastAPI app, CORS, lifespan, router mounts |
| `backend/tests/__init__.py` | Create | Empty |
| `backend/tests/conftest.py` | Create | SQLite test DB, TestClient, dependency overrides |
| `backend/tests/test_engine.py` | Create | Unit tests for `calculate_recommendation` |
| `backend/tests/test_market_service.py` | Create | Service tests for cache logic |
| `backend/tests/test_api.py` | Create | API integration tests for all 5 endpoints |

---

## Task 1: Project scaffold

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/alembic.ini`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "vanguard-recommender-backend"
version = "0.1.0"
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
    "httpx>=0.27",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

- [ ] **Step 2: Create `backend/alembic.ini`**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = %(DATABASE_URL)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 3: Install dependencies**

```bash
cd backend
uv venv .venv
uv pip install -e ".[dev]"
```

Expected: no errors, `.venv/` created.

---

## Task 2: Database layer

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/database.py`

- [ ] **Step 1: Create `backend/app/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/database.py`**

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Task 3: ORM models

**Files:**
- Create: `backend/app/models.py`

- [ ] **Step 1: Create `backend/app/models.py`**

```python
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    Integer, String, Numeric, Date, DateTime, Text,
    UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, default="IWDA.AS")
    risk_profile: Mapped[str] = mapped_column(String(20), nullable=False, default="balanced")


class MarketPrice(Base):
    __tablename__ = "market_prices"
    __table_args__ = (UniqueConstraint("ticker", "date", name="uq_ticker_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    close_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    market_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    drawdown: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    drawdown_pct: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    multiplier: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    rule_triggered: Mapped[str] = mapped_column(String(20), nullable=False)
    recommended_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    executed_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
```

---

## Task 4: Pydantic schemas

**Files:**
- Create: `backend/app/schemas.py`

- [ ] **Step 1: Create `backend/app/schemas.py`**

```python
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    ticker: str
    risk_profile: str


class SettingsUpdate(BaseModel):
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    ticker: str
    risk_profile: str


class RecommendationResult(BaseModel):
    current_price: Decimal
    drawdown: Decimal
    drawdown_pct: Decimal
    multiplier: Decimal
    recommended_amount: Decimal
    rule_triggered: str
    explanation: str


class RecommendationRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    ticker: str
    market_price: Decimal
    drawdown: Decimal
    drawdown_pct: Decimal
    multiplier: Decimal
    rule_triggered: str
    recommended_amount: Decimal
    executed_amount: Decimal | None
    explanation: str


class PricePoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    close_price: Decimal
```

---

## Task 5: Alembic migration

**Files:**
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial.py`

- [ ] **Step 1: Initialise Alembic**

```bash
cd backend
uv run alembic init alembic
```

Expected: `alembic/` directory with `env.py` and `versions/` created.

- [ ] **Step 2: Replace `backend/alembic/env.py`**

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.models import Base  # noqa: E402
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Create `backend/alembic/versions/0001_initial.py`**

```python
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("base_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("min_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("max_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("risk_profile", sa.String(20), nullable=False),
    )
    op.create_table(
        "market_prices",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("close_price", sa.Numeric(12, 4), nullable=False),
        sa.UniqueConstraint("ticker", "date", name="uq_ticker_date"),
    )
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("drawdown", sa.Numeric(8, 6), nullable=False),
        sa.Column("drawdown_pct", sa.Numeric(6, 2), nullable=False),
        sa.Column("multiplier", sa.Numeric(4, 2), nullable=False),
        sa.Column("rule_triggered", sa.String(20), nullable=False),
        sa.Column("recommended_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("executed_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("explanation", sa.Text, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("recommendations")
    op.drop_table("market_prices")
    op.drop_table("settings")
```

- [ ] **Step 4: Run migration against Docker Postgres**

Ensure Docker is running (`docker compose up -d`), then:

```bash
cd backend
uv run alembic upgrade head
```

Expected output ends with: `Running upgrade  -> 0001, initial schema`

---

## Task 6: Market data service — unit tests first

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_market_service.py`

- [ ] **Step 1: Create `backend/tests/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/tests/conftest.py`**

```python
import os

# Must be set before any app imports so database.py reads this URL at import time.
# File-based SQLite ensures the lifespan's SessionLocal() and the test session
# share the same on-disk database (unlike :memory: which is per-connection).
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_vanguard.db")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.database as db_module
from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test_vanguard.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch db module so the lifespan's SessionLocal() also uses the test engine.
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Write failing tests in `backend/tests/test_market_service.py`**

```python
from datetime import date, timedelta
from decimal import Decimal
from app.models import MarketPrice, Settings
from app.services.market import ensure_prices_fresh, get_latest_price, get_price_history


def _insert_prices(db, ticker: str, days: int, base_price: float = 100.0):
    today = date.today()
    for i in range(days):
        d = today - timedelta(days=i)
        if d.weekday() < 5:  # skip weekends
            db.add(MarketPrice(ticker=ticker, date=d, close_price=Decimal(str(base_price - i * 0.1))))
    db.commit()


def test_get_latest_price_returns_most_recent(db):
    _insert_prices(db, "IWDA.AS", 10)
    price = get_latest_price("IWDA.AS", db)
    assert price == get_price_history("IWDA.AS", 1, db)[0].close_price


def test_get_price_history_returns_correct_count(db):
    _insert_prices(db, "IWDA.AS", 30)
    history = get_price_history("IWDA.AS", 30, db)
    assert len(history) > 0
    assert all(h.close_price > 0 for h in history)


def test_ensure_prices_fresh_skips_fetch_when_today_exists(db, monkeypatch):
    today = date.today()
    db.add(MarketPrice(ticker="IWDA.AS", date=today, close_price=Decimal("105.00")))
    db.commit()

    called = []

    def mock_download(*args, **kwargs):
        called.append(True)
        return {}

    monkeypatch.setattr("app.services.market.yf.download", mock_download)
    ensure_prices_fresh("IWDA.AS", db)
    assert called == [], "yfinance should not be called when today's price exists"


def test_ensure_prices_fresh_calls_yfinance_when_stale(db, monkeypatch):
    import pandas as pd

    yesterday = date.today() - timedelta(days=1)
    db.add(MarketPrice(ticker="IWDA.AS", date=yesterday, close_price=Decimal("104.00")))
    db.commit()

    mock_data = pd.DataFrame(
        {"Close": [105.0]},
        index=pd.to_datetime([date.today().isoformat()])
    )
    mock_data.columns = pd.MultiIndex.from_tuples([("Close", "IWDA.AS")])

    def mock_download(*args, **kwargs):
        return mock_data

    monkeypatch.setattr("app.services.market.yf.download", mock_download)
    ensure_prices_fresh("IWDA.AS", db)

    price = get_latest_price("IWDA.AS", db)
    assert price == Decimal("105.0000")
```

- [ ] **Step 4: Run tests — expect failure (service not implemented yet)**

```bash
cd backend
uv run pytest tests/test_market_service.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` on `app.services.market`.

---

## Task 7: Market data service — implementation

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/market.py`

- [ ] **Step 1: Create `backend/app/services/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/services/market.py`**

```python
from datetime import date, timedelta
from decimal import Decimal

import yfinance as yf
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import MarketPrice
from app.schemas import PricePoint


def _has_today(ticker: str, db: Session) -> bool:
    today = date.today()
    row = db.execute(
        select(MarketPrice).where(
            MarketPrice.ticker == ticker,
            MarketPrice.date == today,
        )
    ).first()
    return row is not None


def _has_any(ticker: str, db: Session) -> bool:
    row = db.execute(select(MarketPrice).where(MarketPrice.ticker == ticker).limit(1)).first()
    return row is not None


def _upsert_prices(ticker: str, df, db: Session) -> None:
    if df is None or df.empty:
        return
    # yfinance returns MultiIndex columns when auto_adjust=True
    try:
        closes = df["Close"][ticker]
    except (KeyError, TypeError):
        try:
            closes = df["Close"]
        except KeyError:
            return

    rows = [
        {"ticker": ticker, "date": d.date(), "close_price": Decimal(str(round(float(v), 4)))}
        for d, v in closes.items()
        if v is not None and not (hasattr(v, "__float__") and __import__("math").isnan(float(v)))
    ]
    if not rows:
        return

    # Use INSERT OR IGNORE for SQLite (tests); ON CONFLICT DO NOTHING for Postgres
    from sqlalchemy import inspect as sa_inspect
    dialect = db.bind.dialect.name if db.bind else "postgresql"

    for row in rows:
        existing = db.execute(
            select(MarketPrice).where(
                MarketPrice.ticker == row["ticker"],
                MarketPrice.date == row["date"],
            )
        ).first()
        if not existing:
            db.add(MarketPrice(**row))
    db.commit()


def ensure_prices_fresh(ticker: str, db: Session) -> None:
    if _has_today(ticker, db):
        return
    period = "7d" if _has_any(ticker, db) else "3y"
    df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
    _upsert_prices(ticker, df, db)


def get_latest_price(ticker: str, db: Session) -> Decimal:
    row = db.execute(
        select(MarketPrice)
        .where(MarketPrice.ticker == ticker)
        .order_by(MarketPrice.date.desc())
        .limit(1)
    ).scalar_one()
    return row.close_price


def get_price_history(ticker: str, days: int, db: Session) -> list[PricePoint]:
    cutoff = date.today() - timedelta(days=days)
    rows = db.execute(
        select(MarketPrice)
        .where(MarketPrice.ticker == ticker, MarketPrice.date >= cutoff)
        .order_by(MarketPrice.date.asc())
    ).scalars().all()
    return [PricePoint.model_validate(r) for r in rows]
```

- [ ] **Step 3: Run market service tests — expect pass**

```bash
cd backend
uv run pytest tests/test_market_service.py -v
```

Expected: all 4 tests PASS.

---

## Task 8: Recommendation engine — unit tests first

**Files:**
- Create: `backend/tests/test_engine.py`

- [ ] **Step 1: Write failing tests in `backend/tests/test_engine.py`**

```python
from decimal import Decimal
from datetime import date, timedelta
from app.schemas import PricePoint, SettingsRead
from app.services.recommendation import calculate_recommendation


def _make_prices(current: float, peak: float, days: int = 365) -> list[PricePoint]:
    today = date.today()
    prices = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        price = peak if i == 0 else current
        prices.append(PricePoint(date=d, close_price=Decimal(str(price))))
    return prices


def _make_settings(
    base: float = 300.0,
    min_: float = 100.0,
    max_: float = 1000.0,
    risk: str = "balanced",
) -> SettingsRead:
    return SettingsRead(
        id=1,
        base_amount=Decimal(str(base)),
        min_amount=Decimal(str(min_)),
        max_amount=Decimal(str(max_)),
        ticker="IWDA.AS",
        risk_profile=risk,
    )


# --- Balanced profile ---

def test_balanced_no_drawdown():
    prices = _make_prices(current=100.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.0")
    assert result.rule_triggered == "DD_0_5"
    assert result.recommended_amount == Decimal("300.00")


def test_balanced_dd_5_10():
    prices = _make_prices(current=93.0, peak=100.0)  # -7%
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.2")
    assert result.rule_triggered == "DD_5_10"
    assert result.recommended_amount == Decimal("360.00")


def test_balanced_dd_10_20():
    prices = _make_prices(current=87.0, peak=100.0)  # -13%
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.4")
    assert result.rule_triggered == "DD_10_20"
    assert result.recommended_amount == Decimal("420.00")


def test_balanced_dd_gt_20():
    prices = _make_prices(current=75.0, peak=100.0)  # -25%
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.8")
    assert result.rule_triggered == "DD_GT_20"
    assert result.recommended_amount == Decimal("540.00")


# --- Conservative profile ---

def test_conservative_dd_5_10():
    prices = _make_prices(current=93.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="conservative"))
    assert result.multiplier == Decimal("1.1")
    assert result.recommended_amount == Decimal("330.00")


def test_conservative_dd_gt_20():
    prices = _make_prices(current=75.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="conservative"))
    assert result.multiplier == Decimal("1.5")
    assert result.recommended_amount == Decimal("450.00")


# --- Aggressive profile ---

def test_aggressive_dd_10_20():
    prices = _make_prices(current=87.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="aggressive"))
    assert result.multiplier == Decimal("2.0")
    assert result.recommended_amount == Decimal("600.00")


def test_aggressive_dd_gt_20():
    prices = _make_prices(current=75.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="aggressive"))
    assert result.multiplier == Decimal("2.5")
    assert result.recommended_amount == Decimal("750.00")


# --- Clamping ---

def test_clamp_to_max():
    prices = _make_prices(current=75.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(base=300.0, max_=500.0, risk="aggressive"))
    assert result.recommended_amount == Decimal("500.00")  # 750 clamped to 500


def test_clamp_to_min():
    prices = _make_prices(current=100.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(base=50.0, min_=100.0))
    assert result.recommended_amount == Decimal("100.00")  # 50 clamped to 100


# --- Drawdown calculation ---

def test_drawdown_formula():
    prices = _make_prices(current=87.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings())
    assert result.drawdown == Decimal("-0.130000")
    assert result.drawdown_pct == Decimal("-13.00")


# --- Explanation ---

def test_explanation_contains_drawdown_pct():
    prices = _make_prices(current=87.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings())
    assert "13.0" in result.explanation
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend
uv run pytest tests/test_engine.py -v
```

Expected: `ImportError` on `app.services.recommendation`.

---

## Task 9: Recommendation engine — implementation

**Files:**
- Create: `backend/app/services/recommendation.py`

- [ ] **Step 1: Create `backend/app/services/recommendation.py`**

```python
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.models import Recommendation, Settings
from app.schemas import PricePoint, RecommendationResult, SettingsRead
from app.services.market import ensure_prices_fresh, get_latest_price, get_price_history

MULTIPLIERS: dict[str, list[tuple[float, Decimal, str]]] = {
    "conservative": [
        (-0.20, Decimal("1.5"), "DD_GT_20"),
        (-0.10, Decimal("1.2"), "DD_10_20"),
        (-0.05, Decimal("1.1"), "DD_5_10"),
        (0.0,   Decimal("1.0"), "DD_0_5"),
    ],
    "balanced": [
        (-0.20, Decimal("1.8"), "DD_GT_20"),
        (-0.10, Decimal("1.4"), "DD_10_20"),
        (-0.05, Decimal("1.2"), "DD_5_10"),
        (0.0,   Decimal("1.0"), "DD_0_5"),
    ],
    "aggressive": [
        (-0.20, Decimal("2.5"), "DD_GT_20"),
        (-0.10, Decimal("2.0"), "DD_10_20"),
        (-0.05, Decimal("1.5"), "DD_5_10"),
        (0.0,   Decimal("1.0"), "DD_0_5"),
    ],
}


def calculate_recommendation(
    prices: list[PricePoint],
    settings: SettingsRead,
) -> RecommendationResult:
    closes = [p.close_price for p in prices]
    current_price = closes[-1]
    max_12m = max(closes)

    drawdown = (current_price - max_12m) / max_12m
    drawdown = drawdown.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    drawdown_pct = (drawdown * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    table = MULTIPLIERS.get(settings.risk_profile, MULTIPLIERS["balanced"])
    multiplier, rule = Decimal("1.0"), "DD_0_5"
    for threshold, mult, key in table:
        if float(drawdown) <= threshold:
            multiplier, rule = mult, key
            break

    raw = settings.base_amount * multiplier
    recommended = max(settings.min_amount, min(settings.max_amount, raw))
    recommended = recommended.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    explanation = (
        f"Market is {abs(float(drawdown_pct)):.1f}% below its 12-month high."
        if drawdown < 0
        else "Market is at or near its 12-month high."
    )

    return RecommendationResult(
        current_price=current_price,
        drawdown=drawdown,
        drawdown_pct=drawdown_pct,
        multiplier=multiplier,
        recommended_amount=recommended,
        rule_triggered=rule,
        explanation=explanation,
    )


def generate_recommendation(db: Session) -> RecommendationResult:
    from sqlalchemy import select
    settings_row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one()
    settings = SettingsRead.model_validate(settings_row)

    ensure_prices_fresh(settings.ticker, db)
    prices = get_price_history(settings.ticker, 365, db)

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

- [ ] **Step 2: Run engine tests — expect pass**

```bash
cd backend
uv run pytest tests/test_engine.py -v
```

Expected: all 12 tests PASS.

---

## Task 10: FastAPI app and routers

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/settings.py`
- Create: `backend/app/routers/recommendation.py`
- Create: `backend/app/routers/history.py`
- Create: `backend/app/routers/market.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/routers/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/app/routers/settings.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    return row


@router.put("", response_model=SettingsRead)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    row.base_amount = body.base_amount
    row.min_amount = body.min_amount
    row.max_amount = body.max_amount
    row.ticker = body.ticker
    row.risk_profile = body.risk_profile
    db.commit()
    db.refresh(row)
    return row
```

- [ ] **Step 3: Create `backend/app/routers/recommendation.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RecommendationResult
from app.services.recommendation import generate_recommendation

router = APIRouter(prefix="/api/recommendation", tags=["recommendation"])


@router.post("/generate", response_model=RecommendationResult)
def generate(db: Session = Depends(get_db)):
    return generate_recommendation(db)
```

- [ ] **Step 4: Create `backend/app/routers/history.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation
from app.schemas import RecommendationRecord

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[RecommendationRecord])
def get_history(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Recommendation).order_by(Recommendation.created_at.desc())
    ).scalars().all()
    return rows
```

- [ ] **Step 5: Create `backend/app/routers/market.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Settings
from app.schemas import PricePoint
from app.services.market import ensure_prices_fresh, get_price_history

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/history", response_model=list[PricePoint])
def market_history(db: Session = Depends(get_db)):
    settings = db.execute(select(Settings).where(Settings.id == 1)).scalar_one()
    ensure_prices_fresh(settings.ticker, db)
    return get_price_history(settings.ticker, 365, db)
```

- [ ] **Step 6: Create `backend/app/main.py`**

```python
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import Base, Settings
from app.routers import history, market, recommendation, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    db: Session = SessionLocal()
    try:
        from sqlalchemy import select
        row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
        if row is None:
            db.add(Settings(
                id=1,
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


app = FastAPI(title="IndexApportationRecommender API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router)
app.include_router(recommendation.router)
app.include_router(history.router)
app.include_router(market.router)
```

---

## Task 11: API integration tests

**Files:**
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write `backend/tests/test_api.py`**

```python
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from app.models import MarketPrice, Settings
from app.schemas import PricePoint


def _seed_settings(db, base=300.0, min_=100.0, max_=1000.0, ticker="IWDA.AS", risk="balanced"):
    # Use merge() so this works whether the lifespan already seeded id=1 or not.
    db.merge(Settings(
        id=1,
        base_amount=Decimal(str(base)),
        min_amount=Decimal(str(min_)),
        max_amount=Decimal(str(max_)),
        ticker=ticker,
        risk_profile=risk,
    ))
    db.commit()


def _seed_prices(db, ticker="IWDA.AS", days=400, base_price=100.0):
    today = date.today()
    for i in range(days):
        d = today - timedelta(days=i)
        if d.weekday() < 5:
            db.add(MarketPrice(
                ticker=ticker,
                date=d,
                close_price=Decimal(str(round(base_price - i * 0.01, 4))),
            ))
    db.commit()


# --- Settings ---

def test_get_settings_returns_row(client, db):
    _seed_settings(db)
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert data["base_amount"] == "300.00"
    assert data["risk_profile"] == "balanced"


def test_put_settings_updates_row(client, db):
    _seed_settings(db)
    r = client.put("/api/settings", json={
        "base_amount": "500.00",
        "min_amount": "200.00",
        "max_amount": "2000.00",
        "ticker": "URTH",
        "risk_profile": "aggressive",
    })
    assert r.status_code == 200
    assert r.json()["base_amount"] == "500.00"
    assert r.json()["ticker"] == "URTH"


def test_get_settings_returns_seeded_defaults(client):
    # Lifespan seeds id=1 with defaults on startup — verify they are present.
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert r.json()["ticker"] == "IWDA.AS"
    assert r.json()["risk_profile"] == "balanced"


# --- History ---

def test_get_history_empty(client, db):
    r = client.get("/api/history")
    assert r.status_code == 200
    assert r.json() == []


# --- Market history ---

def test_get_market_history_returns_prices(client, db):
    _seed_settings(db)
    _seed_prices(db)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        r = client.get("/api/market/history")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert "date" in data[0]
    assert "close_price" in data[0]


# --- Recommendation generate ---

def test_generate_recommendation(client, db):
    _seed_settings(db)
    _seed_prices(db, base_price=100.0)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        r = client.post("/api/recommendation/generate")
    assert r.status_code == 200
    data = r.json()
    assert "current_price" in data
    assert "drawdown" in data
    assert "multiplier" in data
    assert "recommended_amount" in data
    assert "rule_triggered" in data
    assert "explanation" in data


def test_generate_recommendation_stored_in_history(client, db):
    _seed_settings(db)
    _seed_prices(db)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        client.post("/api/recommendation/generate")
        r = client.get("/api/history")
    assert r.status_code == 200
    assert len(r.json()) == 1
```

- [ ] **Step 2: Run all tests**

```bash
cd backend
uv run pytest tests/ -v --cov=app --cov-report=term-missing
```

Expected: all tests PASS, coverage ≥ 80% on `app/services/` and `app/routers/`.

---

## Task 12: Smoke test the running server

- [ ] **Step 1: Start the server**

```bash
cd backend
DATABASE_URL=postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db uv run uvicorn app.main:app --reload --port 8000
```

Expected: `Application startup complete.`

- [ ] **Step 2: Verify settings endpoint**

```bash
curl -s http://localhost:8000/api/settings | python -m json.tool
```

Expected: JSON with `base_amount`, `ticker`, `risk_profile`.

- [ ] **Step 3: Generate a recommendation**

```bash
curl -s -X POST http://localhost:8000/api/recommendation/generate | python -m json.tool
```

Expected: JSON with `current_price`, `drawdown_pct`, `multiplier`, `recommended_amount`, `rule_triggered`, `explanation`. This call fetches live data from yfinance — may take 5–10 seconds.

- [ ] **Step 4: Verify history stored**

```bash
curl -s http://localhost:8000/api/history | python -m json.tool
```

Expected: array with 1 entry matching the recommendation just generated.

- [ ] **Step 5: Verify market history**

```bash
curl -s http://localhost:8000/api/market/history | python -m json.tool | head -20
```

Expected: array of `{date, close_price}` objects.
