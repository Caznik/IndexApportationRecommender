# Documentation Artifact — WI-20260514-dockerInfrastructure

## What Was Built

Infrastructure-only `docker-compose.yml` for local development of IndexApportationRecommender. Provides a persistent, health-checked PostgreSQL 16 instance reachable from a host-side FastAPI backend.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | PostgreSQL 16-alpine service |
| `.env.example` | Committed env var documentation with dev defaults |
| `.env` | Gitignored local credentials (copy of `.env.example`) |
| `.gitignore` | Protects `.env`; covers Python, Node, IDE, OS artifacts |
| `README.md` | First-time setup instructions |

## Architecture Notes

- The FastAPI backend runs on the host and connects via `localhost:5432` — **do not** use the Docker service name `db` in `DATABASE_URL`.
- Port is bound to `127.0.0.1` only — not exposed on the LAN.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` are loaded by both the Compose interpolation engine (for port/healthcheck expressions) and the `env_file:` directive (injected into the container). Both read from the same `.env` file.
- Named volume `IndexApportationRecommender_postgres_data` survives `docker compose down`. Use `docker compose down -v` only to wipe data intentionally.

## How to Run

```bash
cp .env.example .env          # bash
# Copy-Item .env.example .env  # PowerShell

docker compose up -d
docker compose ps              # wait for 'healthy'
```

## Acceptance Criteria

- [x] AC-001: PostgreSQL with persistent named volume
- [x] AC-002: Credentials externalized via `.env`
- [x] AC-003: Health check (`pg_isready`, 10s/5s/5)
- [N/A] AC-004: Mail service — removed from product scope
- [x] AC-005: `docker compose up -d` starts without errors
- [x] AC-006: `.env.example` documents all required variables
