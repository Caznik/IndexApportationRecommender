# Source of Truth

## Metadata
- id: WI-20260518-outcomeTracking
- title: Outcome tracking — show post-execution price performance per history record
- feature_type: api | ui | data
- created_at: 2026-05-18T00:00:00
- last_checkpoint: 2026-05-18T19:52:00

## User Request
Outcome tracking — when a user marks a recommendation as executed (executed_amount exists in the DB schema), the app could later show whether the entry point turned out to be good. Even a simple "price 3 months later: +X%" per history record would be valuable.

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-18T00:00:00
  completed_at: 2026-05-18T00:00:00
  artifact: docs/superpowers/plans/2026-05-18-outcome-tracking.md
  user_approved: true

implementation:
  started_at: 2026-05-18T00:00:00
  completed_at: 2026-05-18T19:52:00
  artifact: null

review:
  started_at: 2026-05-18T19:52:00
  completed_at: 2026-05-18T19:52:00
  artifact: null
  iteration: 1

documentation:
  started_at: null
  completed_at: null
  artifact: null

## Acceptance Criteria
- [x] AC-001: Each executed history record displays a "price N months later" percentage change
- [x] AC-002: Outcome data is fetched from existing market_prices table at +30d, +90d, +180d windows
- [x] AC-003: Outcome is only shown when sufficient time has elapsed since the execution date; pending shows countdown
- [x] AC-004: New GET /api/history/{id}/outcomes endpoint returns OutcomeResponse with three snapshots
- [x] AC-005: UI clearly distinguishes "pending outcome" (countdown chip) from "outcome available" (coloured %)

## Blockers
<!-- none -->
