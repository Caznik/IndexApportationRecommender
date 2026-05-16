# Documentation — WI-20260514-backendMVP

**Date:** 2026-05-14
**Status:** DONE

---

## Implementation Summary

Built the full Python/FastAPI backend for IndexApportationRecommender.

### Files Created

| File | Purpose |
|------|---------|
| `backend/pyproject.toml` | Package metadata and dependencies |
| `backend/alembic.ini` | Alembic config |
| `backend/alembic/env.py` | Alembic env wired to SQLAlchemy models |
| `backend/alembic/versions/0001_initial.py` | Initial migration: all 3 tables |
| `backend/app/database.py` | Engine, SessionLocal, get_db dependency |
| `backend/app/models.py` | Settings, MarketPrice, Recommendation ORM models |
| `backend/app/schemas.py` | All Pydantic v2 schemas with input validation |
| `backend/app/services/market.py` | yfinance fetch, DB cache, price queries |
| `backend/app/services/recommendation.py` | Drawdown calc, multiplier engine, orchestrator |
| `backend/app/routers/settings.py` | GET/PUT /api/settings |
| `backend/app/routers/recommendation.py` | POST /api/recommendation/generate |
| `backend/app/routers/history.py` | GET /api/history |
| `backend/app/routers/market.py` | GET /api/market/history |
| `backend/app/main.py` | FastAPI app, CORS, lifespan, router mounts |
| `backend/tests/conftest.py` | Shared in-memory SQLite, TestClient setup |
| `backend/tests/test_engine.py` | 12 unit tests for calculate_recommendation |
| `backend/tests/test_market_service.py` | 4 service tests for cache logic |
| `backend/tests/test_api.py` | 7 API integration tests |

### Tests

- **23 tests, all passing**
- **91% total coverage** (target was ≥80% on `app/services/` and `app/routers/`)
- No network calls in test suite — yfinance is monkeypatched

### Acceptance Criteria

All 9 ACs from the spec are satisfied. Verified by tests and live smoke test against Docker PostgreSQL.

---

## Documentation Changes

- **README.md** updated: corrected stack (removed APScheduler, updated Python version), added full backend setup steps (uv install, alembic migration, server start, test run), added API endpoint table.

---

## Patterns Documented

`workitems/WI-20260514-backendMVP/documentation/patterns/api-WI-20260514-backendMVP.md`

- Pure function / orchestrator split
- Dialect-aware upsert (SQLite + PostgreSQL)
- Shared in-memory SQLite for tests
- Input validation at system boundary
- Two-mode yfinance cache strategy
