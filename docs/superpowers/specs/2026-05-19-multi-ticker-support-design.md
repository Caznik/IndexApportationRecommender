# Multi-Ticker Support — Design Spec

**Date:** 2026-05-19
**Workitem:** WI-20260519-multiTickerSupport
**Status:** Approved

---

## Problem

Settings currently stores a single ticker (`Settings.ticker`) as a singleton row (id=1). Users with
multiple ETFs (e.g., URTH + VWRA) cannot have per-ticker recommendation profiles with different
base/min/max amounts and risk profiles. The data layer is already multi-ticker ready:
`MarketPrice` stores prices per ticker, `Recommendation` stores `ticker` per record, and all
market-service functions accept a `ticker` param. The gap is in Settings and the frontend.

---

## Approach

**Lift the `id=1` singleton by adding `UNIQUE(ticker)` to the `settings` table.** Each row
becomes a named ticker profile. This avoids a table rename and preserves existing data through a
single migration — the existing IWDA.AS row satisfies the new unique constraint automatically.

Alternative considered: create a new `ticker_profiles` table. Rejected because it introduces a
table rename, complicates existing FK assumptions, and provides no benefit over Option A given
that Settings has no other "global" fields.

---

## Architecture

### Database

```
settings (existing table, extended)
┌─────────────────────────────────────────────────────────────────┐
│ id           SERIAL PRIMARY KEY                                  │
│ ticker       VARCHAR(20) NOT NULL  UNIQUE  ← new constraint     │
│ base_amount  NUMERIC(10,2) NOT NULL                             │
│ min_amount   NUMERIC(10,2) NOT NULL                             │
│ max_amount   NUMERIC(10,2) NOT NULL                             │
│ risk_profile VARCHAR(20) NOT NULL                               │
└─────────────────────────────────────────────────────────────────┘
```

Migration `0002_per_ticker_settings.py`: `CREATE UNIQUE INDEX / ADD CONSTRAINT` on `ticker`.
Existing IWDA.AS row is preserved with no data surgery.

### Backend

**Settings router** — replaces the singleton PUT/GET pair with a collection CRUD:
```
GET    /api/settings           → list[SettingsRead]    (ordered by ticker)
POST   /api/settings           → SettingsRead          (409 if ticker exists)
GET    /api/settings/{ticker}  → SettingsRead
PUT    /api/settings/{ticker}  → SettingsRead          (amounts + risk only; ticker = route key)
DELETE /api/settings/{ticker}  → 204
```

**Recommendation router** — adds required `ticker` query param:
```
POST /api/recommendation/generate?ticker=IWDA.AS → RecommendationResult
```

**Market router** — replaces Settings DB lookup with required `ticker` query param:
```
GET /api/market/history?ticker=IWDA.AS → list[PricePoint]
```

**History router** — adds optional `ticker` query param for filtering:
```
GET /api/history              → all records (unchanged behaviour)
GET /api/history?ticker=URTH → only URTH records
```

**Recommendation service** — `generate_recommendation(db, ticker)` looks up the Settings row by
ticker rather than by `id=1`. `calculate_recommendation` is unchanged (pure function).

**Lifespan seed** — updated to check by ticker (`Settings.ticker == "IWDA.AS"`) instead of `id == 1`.

### Frontend

**State shape** (`store.ts`):

| Before | After |
|--------|-------|
| `settings: Settings \| null` | `settings: Settings[]` |
| `recommendation: RecommendationResult \| null` | `recommendations: Record<string, RecommendationResult>` |
| `recommendationRestoredAt: string \| null` | `recommendationRestoredAt: Record<string, string \| null>` |
| — | `activeTicker: string \| null` |
| `saveSettings(update)` | `saveProfile(ticker, update)` + `createProfile(body)` + `deleteProfile(ticker)` |
| `generate()` | `generate(ticker)` |
| `restoreRecommendation()` | `restoreRecommendation(ticker)` |
| `fetchHistory()` | `fetchHistory(ticker?)` |

`fetchSettings()` sets `activeTicker` to the alphabetically-first ticker when `activeTicker` is
currently null and at least one profile exists.

**Settings page** (`Settings.tsx`) — full rewrite:
- Lists all ticker profiles as cards (ticker name, risk badge, amounts)
- Edit button: opens inline form with amounts + risk; ticker field is read-only
- Delete button: inline confirmation before calling `deleteProfile`
- "Add Ticker" button: opens blank form; `ticker` field is editable; calls `createProfile`
- Same validation rules: amounts > 0, min ≤ max, ticker non-empty

**Dashboard page** (`Dashboard.tsx`):
- Reads `settings: Settings[]` and `activeTicker`
- When `settings.length > 1`: renders a row of ticker tab buttons above `HeroCard`
- When `settings.length === 1`: no tab bar (same UX as today)
- Clicking a tab calls `setActiveTicker(ticker)`
- All data (recommendation, price history, stat cards) is scoped to `activeTicker`
- Price history `useEffect` depends on `activeTicker` — re-fetches on tab switch
- `onGenerate` forwards `activeTicker`: `() => generate(activeTicker!)`

**History page** (`History.tsx`):
- Adds a filter row below the heading: "All" pill + one pill per ticker in `settings`
- Local state `filterTicker: string | null` (null = All)
- Selecting a pill calls `fetchHistory(ticker)` or `fetchHistory()` for All
- No changes to `ContributionCalendar`, `HistoryTable`, `HistoryCardList`

---

## Data Flow

```
User adds VWRA in Settings →
  POST /api/settings {ticker: "VWRA", ...} →
  Backend inserts new Settings row →
  Frontend fetchSettings() updates settings[] →
  activeTicker unchanged (stays on current ticker)

User clicks VWRA tab on Dashboard →
  setActiveTicker("VWRA") →
  useEffect fires → getPriceHistory("VWRA") →
  if recommendations["VWRA"] is empty → restoreRecommendation("VWRA")

User clicks Generate →
  generate("VWRA") →
  POST /api/recommendation/generate?ticker=VWRA →
  Backend fetches VWRA Settings row, fetches VWRA prices, calculates result →
  Stores Recommendation(ticker="VWRA", ...) →
  Frontend sets recommendations["VWRA"]
```

---

## Error Handling

- `POST /api/settings` with existing ticker → 409 Conflict
- `POST /api/recommendation/generate?ticker=X` with no profile for X → 404 Not Found
- `GET /api/market/history` without ticker param → 422 Unprocessable Entity (FastAPI default)
- Dashboard with no active ticker (empty profiles list) — guard with null check, show "Add a ticker profile in Settings"
- Delete last profile — allowed; Dashboard will show the empty state

---

## Testing

**Backend (`test_api.py`):**
- `_seed_settings` helper updated to upsert by ticker (not `id=1`)
- Existing tests updated: settings endpoints use new URLs; recommendation/market add `?ticker=`
- New tests: POST creates profile, POST 409 on duplicate, DELETE removes profile, GET history filters by ticker

**Frontend:**
- `api.test.ts`: updated signatures for all changed functions + new `createSettings`/`deleteSettings`
- `store.test.ts`: new state shape; `generate('IWDA.AS')` asserts `recommendations['IWDA.AS']`; new `createProfile`/`deleteProfile`/`setActiveTicker` tests
- `Settings.test.tsx`: full rewrite for profile-list UI
- `Dashboard.test.tsx`: `settings` as array; assert tab bar renders with 2 profiles; assert `generate`/`getPriceHistory` called with `activeTicker`
- `History.test.tsx`: assert filter pills appear; assert `fetchHistory` called with ticker

**Unchanged test files:** `test_engine.py`, `test_market_service.py`, `PriceChart.test.tsx`,
`HeroCard.test.tsx`, `HistoryTable.test.tsx`, `HistoryCardList.test.tsx`, `ContributionCalendar.test.tsx`

---

## Out of Scope

- Per-ticker currency symbol (amounts remain in €)
- Sorting or reordering of ticker profiles
- Bulk generate (all tickers at once from Dashboard)
- Import/export of profiles
