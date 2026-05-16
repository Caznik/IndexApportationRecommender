# Source of Truth

## Metadata
- id: WI-20260515-mobileMVP
- title: Mobile-Responsive Web — make existing SPA work well on small screens
- feature_type: ui
- created_at: 2026-05-15T00:00:00Z
- last_checkpoint: INTAKE

## User Request
Make the existing React/Vite/TypeScript SPA mobile-responsive so it works well on small screens (phones, tablets). The current web frontend (Dashboard, Settings, History) was built with Tailwind CSS but not optimized for mobile viewports. Scope: responsive layout polish only — no React Native, no PWA features. A native mobile app may be a future separate workitem.

## Workflow Status
- current_state: DONE
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-15T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: docs/superpowers/plans/2026-05-15-mobile-responsive.md
  user_approved: true

implementation:
  started_at: 2026-05-15T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: workitems/WI-20260515-mobileMVP/implementation/impl_v1.md

review:
  started_at: 2026-05-15T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: workitems/WI-20260515-mobileMVP/review/review_v1.md
  iteration: 1
  outcome: APPROVED

documentation:
  started_at: 2026-05-15T00:00:00Z
  completed_at: 2026-05-15T00:00:00Z
  artifact: workitems/WI-20260515-mobileMVP/documentation/docs_v1.md

## Acceptance Criteria
- [x] AC-001: On a 375px viewport, navigation is provided by a fixed bottom bar with Dashboard / Settings / History tabs
- [x] AC-002: Active bottom tab has a violet top accent line; inactive tabs are grey
- [x] AC-003: Top tab pills are hidden below 640px and visible at 640px+
- [x] AC-004: History page shows card layout below 640px and table layout at 640px+
- [x] AC-005: Each history card displays date, drawdown, price, multiplier, recommended amount, and executed amount (or —)
- [x] AC-006: Dashboard stat cards stack to a single column below 640px
- [x] AC-007: HeroCard padding and font size reduce appropriately on mobile (no overflow)
- [x] AC-008: Main content bottom padding clears the fixed bottom nav bar on mobile
- [x] AC-009: All 29 existing tests continue to pass; 2 new test files added

## Blockers
- None
