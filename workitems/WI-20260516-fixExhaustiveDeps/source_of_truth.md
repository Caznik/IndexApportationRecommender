# Source of Truth

## Metadata
- id: WI-20260516-fixExhaustiveDeps
- title: Fix React hook exhaustive-deps and add ESLint rule
- feature_type: fix
- created_at: 2026-05-16T00:00:00Z
- last_checkpoint: DOCUMENTING

## User Request
Fix React hook exhaustive-deps — fetchSettings is used inside a useEffect but missing from its dependency array. Works today because Zustand actions are stable, but fragile. Add the ESLint rule react-hooks/exhaustive-deps to catch this class of bug automatically.

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
  iteration: 2

documentation:
  started_at: 2026-05-16T00:00:00Z
  completed_at: 2026-05-16T00:00:00Z
  artifact: documentation/docs_v1.md

## Acceptance Criteria
- [x] AC-001: `fetchSettings` is listed in the dependency array of the useEffect in Dashboard.tsx
- [x] AC-002: ESLint rule `react-hooks/exhaustive-deps` is enabled in the frontend ESLint config
- [x] AC-003: Running ESLint on the frontend reports zero exhaustive-deps violations
- [x] AC-004: All existing frontend tests (53/53) continue to pass

## Blockers
<!-- Remove when resolved -->
