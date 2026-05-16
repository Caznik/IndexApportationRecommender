# Source of Truth

## Metadata
- id: WI-20260516-dashboardPriceChangePct
- title: Dashboard price change percentages (vs yesterday and vs last month)
- feature_type: ui
- created_at: 2026-05-16T00:00:00Z
- last_checkpoint: REVIEWING

## User Request
On the dashboard, I would like to have a percentage to show how it has grown or decreased compared to yesterday and the previous month.

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: planning/plan_v1.md
  user_approved: true

implementation:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: implementation/impl_v1.md

review:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: review/review_v1.md
  iteration: 1

documentation:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: documentation/docs_v1.md

## Acceptance Criteria
- [x] AC-001: Dashboard shows % change in price compared to yesterday
- [x] AC-002: Dashboard shows % change in price compared to the same day last month
- [x] AC-003: Values are color-coded (green for positive, red for negative)
- [x] AC-004: Graceful fallback when price history is insufficient (missing dates)

## Blockers
<!-- Remove when resolved -->
