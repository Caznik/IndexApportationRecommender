# Pattern: FastAPI + SQLAlchemy service layer (WI-20260514-backendMVP)

## Pattern: Pure function / orchestrator split

Business logic that can be tested without a DB lives in a pure function (`calculate_recommendation`). The orchestrator (`generate_recommendation`) owns DB access: fetch settings, call the pure function, persist the result. This separation kept unit tests fast and reliable.

**Rule:** Never pass a `Session` into a function that only needs to do arithmetic or apply rules. Separate the data-fetching layer from the logic layer.

## Pattern: Dialect-aware upsert

For tables with a unique constraint, use `INSERT ... ON CONFLICT DO NOTHING` via the SQLAlchemy dialect-specific insert:

```python
dialect = db.get_bind().dialect.name
if dialect == "sqlite":
    from sqlalchemy.dialects.sqlite import insert as dialect_insert
else:
    from sqlalchemy.dialects.postgresql import insert as dialect_insert

stmt = dialect_insert(Model).values(rows).on_conflict_do_nothing(index_elements=["col1", "col2"])
db.execute(stmt)
db.commit()
```

This reduces N round-trips to 1 and is atomic. Works for both the test (SQLite) and production (PostgreSQL) databases.

## Pattern: Shared in-memory SQLite for tests

When a FastAPI lifespan hook runs `SessionLocal()` at startup, file-based SQLite shares the DB across connections. Use the shared in-memory URI instead of a file to avoid leaving test artifacts on disk:

```python
TEST_DATABASE_URL = "sqlite:///file:test_vanguard?mode=memory&cache=shared&uri=true"
```

Patch `db_module.engine` and `db_module.SessionLocal` before importing the app so the lifespan sees the same engine.

## Pattern: Input validation at system boundary

Pydantic `SettingsUpdate` validates at the API boundary, not in service code:
- Positive amounts via `field_validator`
- `min_amount <= max_amount` via `model_validator(mode="after")`
- `risk_profile` as `Literal["conservative", "balanced", "aggressive"]`

Service code trusts validated input and does not re-check.

## Pattern: Cache strategy with two fetch modes

`ensure_prices_fresh` distinguishes first-run (empty table → 3-year history) from incremental updates (today missing → 7-day fetch). At most one yfinance call per ticker per calendar day. "Current price" = most recent row, so weekends/holidays are handled without special logic.
