# Docker Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a single `docker-compose up -d` command that starts a persistent, health-checked PostgreSQL 16 instance for local IndexApportationRecommender development.

**Architecture:** Infrastructure-only compose file — the FastAPI backend and React frontend run on the host. PostgreSQL runs in Docker with a named volume for persistence. All credentials are externalized to a gitignored `.env` file; `.env.example` documents every variable.

**Tech Stack:** Docker Compose v2, PostgreSQL 16-alpine.

---

### Task 1: Create .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
# Local environment — never commit real credentials
.env

# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
dist/
build/

# Node
node_modules/
.next/
dist/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Verify `.env` is ignored**

Run:
```bash
git init
git status
```
Expected: `.gitignore` appears as an untracked file. `.env` (if it exists) does NOT appear.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

### Task 2: Create .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```bash
# PostgreSQL — consumed directly by the postgres Docker image
POSTGRES_USER=vanguard
POSTGRES_PASSWORD=vanguard_dev
POSTGRES_DB=vanguard_db
POSTGRES_PORT=5432

# SQLAlchemy connection string for the FastAPI backend (runs on host, not in Docker)
DATABASE_URL=postgresql://vanguard:vanguard_dev@localhost:5432/vanguard_db
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example with PostgreSQL config"
```

---

### Task 3: Create local .env

**Files:**
- Create: `.env`

- [ ] **Step 1: Copy `.env.example` to `.env`**

```bash
cp .env.example .env
```

The dev defaults in `.env.example` are sufficient for local development. No changes needed.

- [ ] **Step 2: Verify `.env` is gitignored**

Run:
```bash
git status
```
Expected: `.env` does NOT appear in the output. If it does, the `.gitignore` from Task 1 is not in place — stop and fix that first.

---

### Task 4: Create docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

- [ ] **Step 2: Validate compose syntax**

Run:
```bash
docker compose config
```
Expected: Resolved YAML is printed with no errors. Confirm `POSTGRES_PORT`, `POSTGRES_USER`, and `POSTGRES_DB` are substituted with the values from `.env`.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose with PostgreSQL service"
```

---

### Task 5: Verify the stack

**Files:** None — verification only.

- [ ] **Step 1: Start services**

Run:
```bash
docker compose up -d
```
Expected output (order may vary):
```
✔ Container IndexApportationRecommender-db-1  Started
```

- [ ] **Step 2: Confirm health check passes**

Run:
```bash
docker compose ps
```
Expected: `db` service shows `healthy` under STATUS. This may take up to 60 seconds on first run while the image is pulled and initialized.

- [ ] **Step 3: Confirm PostgreSQL accepts connections**

Run:
```bash
docker compose exec db psql -U vanguard -d vanguard_db -c "\l"
```
Expected: A table listing databases including `vanguard_db` is printed. No authentication errors.

- [ ] **Step 4: Confirm data persists across restart**

Run:
```bash
docker compose down
docker compose up -d
docker compose exec db psql -U vanguard -d vanguard_db -c "\l"
```
Expected: Same output as Step 3. The named volume `postgres_data` preserves data across restarts.

- [ ] **Step 5: Stop services**

```bash
docker compose down
```
Expected: `db` container stops and is removed. The `postgres_data` volume is NOT removed (correct — use `docker compose down -v` only when you want to wipe data).
