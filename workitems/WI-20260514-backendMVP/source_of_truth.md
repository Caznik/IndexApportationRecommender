# Source of Truth

## Metadata
- id: WI-20260514-backendMVP
- title: Backend MVP — FastAPI + market data + recommendation engine
- feature_type: api
- created_at: 2026-05-14T00:00:00Z
- last_checkpoint: INTAKE

## User Request
Build the full Python/FastAPI backend for IndexApportationRecommender:
- SQLAlchemy models + Alembic migrations for: settings, market_prices, recommendations tables
- Market data service using yfinance (URTH / IWDA.AS / SWDA.L), 3-year history, daily cache, weekend/holiday handling
- Recommendation engine: drawdown calculation (current price vs 12-month high), multiplier rules (0%→1.0x, -5%→1.2x, -10%→1.4x, -20%→1.8x), min/max contribution clamping
- REST API endpoints:
  - POST /api/recommendation/generate
  - GET /api/settings / PUT /api/settings
  - GET /api/history
  - GET /api/market/history
- Pydantic schemas for all request/response models
- PostgreSQL via docker-compose (already set up in WI-20260514-dockerInfrastructure)

Stack: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, yfinance, PostgreSQL

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-14T00:00:00Z
  completed_at: 2026-05-14T00:00:00Z
  artifact: docs/superpowers/plans/2026-05-14-backend-mvp.md
  user_approved: true

implementation:
  started_at: 2026-05-14T00:00:00Z
  completed_at: 2026-05-14T00:00:00Z
  artifact: workitems/WI-20260514-backendMVP/implementation/impl_v1.md

review:
  started_at: 2026-05-14T00:00:00Z
  completed_at: 2026-05-14T00:00:00Z
  artifact: workitems/WI-20260514-backendMVP/review/review_v1.md
  iteration: 1

documentation:
  started_at: 2026-05-14T00:00:00Z
  completed_at: 2026-05-14T00:00:00Z
  artifact: workitems/WI-20260514-backendMVP/documentation/docs_v1.md

## Acceptance Criteria
- [ ] AC-001: POST /api/recommendation/generate returns current_price, drawdown, drawdown_pct, multiplier, recommended_amount, rule_triggered, explanation
- [ ] AC-002: GET/PUT /api/settings reads and persists base_amount, min_amount, max_amount, ticker, risk_profile
- [ ] AC-003: GET /api/history returns all past recommendations ordered by date desc
- [ ] AC-004: GET /api/market/history returns daily close prices for configured ticker
- [ ] AC-005: Market data is cached in DB and refreshed at most once per day
- [ ] AC-006: Drawdown is computed as (current - max_12m) / max_12m
- [ ] AC-007: Recommended amount is clamped to [min_amount, max_amount]
- [ ] AC-008: All endpoints return correct HTTP status codes and Pydantic-validated responses
- [ ] AC-009: Alembic migrations run cleanly against the Docker PostgreSQL instance

## Blockers
<!-- Remove when resolved -->
