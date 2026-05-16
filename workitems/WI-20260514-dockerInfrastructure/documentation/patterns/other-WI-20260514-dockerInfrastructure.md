# Pattern: Infrastructure-Only Docker Compose

**Workitem:** WI-20260514-dockerInfrastructure
**Feature type:** other (infrastructure)

## Pattern

When only stateful services need containerizing (DB, cache, message broker), keep application services on the host. This avoids volume-mount complexity, hot-reload issues, and Docker networking confusion for developers.

## Key Decisions

- `env_file: .env` injects vars into the container; Compose also reads `.env` automatically for `${VAR}` interpolation in the compose file itself — these are two separate mechanisms reading the same file.
- `DATABASE_URL` must use `localhost` (not the Docker service name) when the consuming app runs on the host.
- Bind published ports to `127.0.0.1` to avoid LAN exposure in dev environments.
- Use `unless-stopped` restart policy: survives reboots, respects explicit `docker compose down`.
