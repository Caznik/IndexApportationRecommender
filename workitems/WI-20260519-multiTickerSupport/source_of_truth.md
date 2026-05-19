# Source of Truth

## Metadata
- id: WI-20260519-multiTickerSupport
- title: Multi-ticker support — separate recommendation profiles per ETF
- feature_type: api, ui, migration
- created_at: 2026-05-19T00:00:00Z
- last_checkpoint: DONE

## User Request
Multi-ticker support — the settings only allow one ticker. Users with multiple ETFs (e.g., URTH + VWRA) need separate recommendation profiles. The backend model already has ticker on history records, so it's partially designed for this.

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-19T00:00:00Z
  completed_at: 2026-05-19T00:00:00Z
  artifact: docs/superpowers/plans/2026-05-19-multi-ticker-support.md
  user_approved: true

implementation:
  started_at: 2026-05-19T00:00:00Z
  completed_at: 2026-05-19T00:00:00Z
  artifact: implementation/impl_v1.md

review:
  started_at: 2026-05-19T00:00:00Z
  completed_at: 2026-05-19T00:00:00Z
  artifact: null
  iteration: 1

documentation:
  started_at: null
  completed_at: null
  artifact: null

## Acceptance Criteria
- [x] AC-001: User can add multiple ticker profiles in Settings (e.g., URTH + VWRA), each with its own base/min/max amounts and risk profile
- [x] AC-002: User can edit an existing ticker profile (amounts and risk profile)
- [x] AC-003: User can delete a ticker profile
- [x] AC-004: Dashboard shows a ticker tab bar when multiple profiles exist; switching tabs updates the recommendation and price chart for that ticker
- [x] AC-005: "Generate" on Dashboard generates a recommendation for the currently active ticker only
- [x] AC-006: History page shows all records by default; user can filter by ticker via pill buttons
- [x] AC-007: Existing IWDA.AS settings data is preserved through the migration (smoke test confirmed 1 IWDA.AS row survives)
- [x] AC-008: All existing backend tests pass; new CRUD and filter tests added (40/40 pass)
- [x] AC-009: All existing frontend tests pass; updated for multi-ticker state shape (128/128 pass)

## Blockers
<!-- None -->
