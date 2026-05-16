# IndexApportationRecommender

Investment Contribution Optimizer — helps long-term passive investors decide how much to invest each month based on current market drawdown conditions.

## Stack

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.x, Alembic, yfinance, PostgreSQL
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Recharts
- **Database:** PostgreSQL 16 (Docker)

## Local Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 20+

### 1. Configure environment

```bash
# bash / macOS / Linux
cp .env.example .env

# PowerShell (Windows)
Copy-Item .env.example .env
```

### 2. Start infrastructure

```bash
docker compose up -d
```

PostgreSQL will be available at `localhost:5432` once the health check passes (usually within 10 seconds).

```bash
docker compose ps   # db should show "healthy"
```

### 3. Set up the backend

```bash
cd backend
uv venv .venv
uv pip install -e ".[dev]"
```

Run database migrations:

```bash
# bash
DATABASE_URL=postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db uv run alembic upgrade head

# PowerShell
$env:DATABASE_URL="postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Start the API server:

```bash
# bash
DATABASE_URL=postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db uv run uvicorn app.main:app --reload --port 8000

# PowerShell
$env:DATABASE_URL="postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

### 4. Run backend tests

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/ -v --cov=app
```

No Docker required — tests use an in-memory SQLite database.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/recommendation/generate` | Generate a contribution recommendation |
| `GET` | `/api/settings` | Get current settings |
| `PUT` | `/api/settings` | Update settings |
| `GET` | `/api/history` | List all past recommendations |
| `PATCH` | `/api/history/{id}` | Record the actual amount contributed for a recommendation |
| `GET` | `/api/market/history` | Daily price history for configured ticker |

### 5. Set up and run the frontend

```bash
cd frontend
npm install
npm run dev
```

The SPA is available at `http://localhost:5173`. All `/api/*` requests are proxied to the FastAPI server at `http://localhost:8000` — both must be running simultaneously for full functionality.

### 6. Run frontend tests

```bash
cd frontend
npm run test:run           # run once
npm run test               # watch mode
npm run test:coverage      # with coverage report
```

No backend required — API calls are mocked with Vitest.

### Frontend routes

| Route | View |
|-------|------|
| `/` | Dashboard — generate recommendation, price chart, stat cards |
| `/settings` | Settings — configure contribution amounts, ticker, risk profile |
| `/history` | History — past recommendations table |

### Stopping infrastructure

```bash
docker compose down        # stops containers, preserves data volume
docker compose down -v     # stops containers AND deletes data volume
```
# IndexApportationRecommender
