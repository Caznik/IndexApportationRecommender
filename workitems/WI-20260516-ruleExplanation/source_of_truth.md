# Source of Truth

## Metadata
- id: WI-20260516-ruleExplanation
- title: Surface human-readable rule explanation inline in HeroCard
- feature_type: enhancement
- created_at: 2026-05-16T00:00:00Z
- last_checkpoint: DONE

## User Request
Rule explanation improvements — DD_0_5 is opaque. Surface a short human-readable explanation of what the rule means and why it fired, ideally inline in the HeroCard rather than only in the separate explanation field.

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
  artifact: null

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
- [x] AC-001: HeroCard subtitle shows `result.explanation` where `result.rule_triggered` used to appear
- [x] AC-002: The raw code `DD_0_5` (and other `DD_*` codes) is no longer visible in the rendered card
- [x] AC-003: All existing frontend tests pass — 61 total (60 + 1 new), lint exit 0

## Blockers
<!-- Remove when resolved -->
