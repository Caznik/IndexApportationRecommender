# Source of Truth

## Metadata
- id: WI-20260514-frontendMVP
- title: Frontend MVP — React dashboard + settings + history
- feature_type: ui
- created_at: 2026-05-14T00:00:00Z
- last_checkpoint: DONE

## User Request
Build the full React/Vite/TypeScript frontend for IndexApportationRecommender:
- Dashboard showing: recommended contribution, difference vs base, current drawdown, multiplier, current price, historical price chart (Recharts), "Generate Recommendation" button
- Settings form: base monthly contribution, minimum contribution, maximum contribution, market ticker, risk profile
- Recommendation history table: date, price, drawdown, multiplier, recommended amount, optional executed amount
- Wire all UI to backend REST API (WI-20260514-backendMVP must be complete first)

Stack: React, Vite, TypeScript, Tailwind CSS, Recharts

Dependency: WI-20260514-backendMVP must be DONE before this workitem enters IMPLEMENTING.

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-14T00:00:00Z
  completed_at: 2026-05-14T00:00:00Z
  artifact: docs/superpowers/plans/2026-05-14-frontend-mvp.md
  user_approved: true

implementation:
  started_at: 2026-05-14T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: workitems/WI-20260514-frontendMVP/implementation/impl_v1.md

review:
  started_at: 2026-05-15T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: workitems/WI-20260514-frontendMVP/review/review_v1.md
  iteration: 1

documentation:
  started_at: 2026-05-15T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: workitems/WI-20260514-frontendMVP/documentation/docs_v1.md

## Acceptance Criteria
- [x] AC-001: Dashboard displays recommended contribution, drawdown %, multiplier, and current price after clicking "Generate Recommendation"
- [x] AC-002: Historical price chart renders using Recharts with data from GET /api/market/history
- [x] AC-003: Settings form persists values via PUT /api/settings and reloads via GET /api/settings on mount
- [x] AC-004: Recommendation history table displays all past recommendations from GET /api/history
- [x] AC-005: "Generate Recommendation" button calls POST /api/recommendation/generate and updates the dashboard
- [x] AC-006: Loading and error states are handled gracefully
- [x] AC-007: UI is responsive and styled with Tailwind CSS

## Blockers
- ~~Blocked on WI-20260514-backendMVP reaching DONE~~ — resolved 2026-05-14, backend is DONE
