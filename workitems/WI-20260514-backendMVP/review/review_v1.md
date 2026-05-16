# Review — WI-20260514-backendMVP

**Date:** 2026-05-14
**Iteration:** 1
**Outcome:** APPROVED (after fixes)

---

## Strengths

- Spec alignment was excellent across all models, multiplier tables, drawdown formula, and cache strategy
- Pure function boundary maintained: `calculate_recommendation` has zero DB access
- Migration covers all 3 tables with correct types, precisions, and unique constraint
- CORS and lifespan match spec exactly
- 23/23 tests passing; coverage ≥ 80% on `app/services/` and `app/routers/`

---

## Issues Found and Fixed

### Important (all fixed)

1. **Empty price list crash** — `calculate_recommendation` raised `IndexError` on empty input; `generate_recommendation` had no guard. Fixed: added `ValueError` guard in pure function and 503 `HTTPException` in orchestrator.

2. **No input validation on `SettingsUpdate`** — accepted negative amounts, invalid `risk_profile`. Fixed: added `field_validator` for positive amounts, `model_validator` for `min≤max`, `Literal` type for `risk_profile`.

3. **N-SELECT upsert race** — `_upsert_prices` issued one SELECT per price row; two concurrent callers could both pass the check and race to INSERT. Fixed: replaced with single `INSERT ... ON CONFLICT DO NOTHING` (dialect-aware for SQLite in tests, PostgreSQL in production).

### Minor (all fixed)

4. **File-based test SQLite** — `test_vanguard.db` left on disk on interrupted runs. Fixed: switched to shared in-memory URI.

5. **Deferred import** — `from sqlalchemy import select` inside `generate_recommendation`. Fixed: moved to module top.

6. **`scalar_one()` could 500** — in `generate_recommendation` if settings row absent. Fixed: changed to `scalar_one_or_none()` with explicit 404.

---

## Acceptance Criteria

| AC | Status |
|----|--------|
| AC-001 POST /api/recommendation/generate returns all 7 fields | PASS |
| AC-002 GET/PUT /api/settings reads and persists 5 fields | PASS |
| AC-003 GET /api/history returns rows ordered desc | PASS |
| AC-004 GET /api/market/history returns daily closes | PASS |
| AC-005 Cache: at most one yfinance call per day | PASS |
| AC-006 Drawdown = (current - max_12m) / max_12m | PASS |
| AC-007 Recommended amount clamped to [min, max] | PASS |
| AC-008 Correct HTTP status codes and Pydantic validation | PASS |
| AC-009 Alembic migrations run cleanly | PASS |

---

## Assessment

**APPROVED** — All issues resolved, 23/23 tests pass, smoke test confirmed against live PostgreSQL.
