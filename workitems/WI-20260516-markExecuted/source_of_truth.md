# Source of Truth

## Metadata
- id: WI-20260516-markExecuted
- title: Mark recommendation as executed with actual amount
- feature_type: feature
- created_at: 2026-05-16T00:00:00Z
- last_checkpoint: DONE

## User Request
How can I mark a recommendation as executed? The DB has an executed_amount column but there is no API endpoint or UI control to set it.

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: docs/superpowers/plans/2026-05-16-mark-executed-plan.md
  user_approved: true

implementation:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: workitems/WI-20260516-markExecuted/implementation/impl_v1.md

review:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: workitems/WI-20260516-markExecuted/review/review_v1.md
  iteration: 1

documentation:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: workitems/WI-20260516-markExecuted/documentation/docs_v1.md

## Acceptance Criteria
- AC-001: Any history row has an Edit button that opens an inline input for executed_amount ✅
- AC-002: Input pre-fills with recommended_amount for new entries; executed_amount for corrections ✅
- AC-003: Save calls PATCH /api/history/{id}, updates the row in the UI without a full-page reload ✅
- AC-004: Cancel closes edit mode with no API call and no state change ✅
- AC-005: PATCH returns 404 for unknown ids, 422 for non-positive amounts ✅
- AC-006: All existing tests continue to pass; new tests cover the above scenarios ✅

## Blockers
<!-- none -->
