# Docker Infrastructure Design

**Date:** 2026-05-14
**Workitem:** WI-20260514-dockerInfrastructure
**Status:** Approved

---

## Scope

Infrastructure-only `docker-compose.yml` for local development of IndexApportationRecommender. The FastAPI backend and React frontend run directly on the host machine. Only stateful services that cannot run trivially on the host are containerized.

**Out of scope:** Application services (backend, frontend), email/notification services (removed from product), Redis, pgAdmin (user has one installed locally).

---

## Services

### PostgreSQL (`db`)

- **Image:** `postgres:16-alpine` — current stable, minimal footprint
- **Restart policy:** `unless-stopped` — survives reboots, respects explicit stops
- **Port:** Configurable via `POSTGRES_PORT` env var, defaults to `5432`
- **Volume:** Named volume `postgres_data` — data persists across `docker-compose down`
- **Health check:** `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` — 10s interval, 5s timeout, 5 retries

---

## Files Produced

| File | Purpose | Committed |
|------|---------|-----------|
| `docker-compose.yml` | Service definitions | Yes |
| `.env.example` | Documents all required env vars with safe dev defaults | Yes |
| `.env` | Actual local credentials | No (gitignored) |
| `.gitignore` | Ensures `.env` is never committed | Yes |

---

## Environment Variables

| Variable | Default | Consumer |
|----------|---------|----------|
| `POSTGRES_USER` | `vanguard` | Docker postgres image |
| `POSTGRES_PASSWORD` | `vanguard_dev` | Docker postgres image |
| `POSTGRES_DB` | `vanguard_db` | Docker postgres image |
| `POSTGRES_PORT` | `5432` | Port mapping |
| `DATABASE_URL` | `postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db` | FastAPI / SQLAlchemy |

`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are the native environment variables consumed directly by the official `postgres` Docker image — no extra init scripts needed.

`DATABASE_URL` uses `localhost` because the FastAPI backend runs on the host (not inside Docker).

---

## Acceptance Criteria

- `docker-compose up -d` starts PostgreSQL without errors
- PostgreSQL health check passes within 60 seconds
- Data persists across `docker-compose down` / `docker-compose up` cycles
- `.env` is not tracked by git
- `.env.example` documents every variable needed to run the stack
