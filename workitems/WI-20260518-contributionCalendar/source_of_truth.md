# Source of Truth

## Metadata
- id: WI-20260518-contributionCalendar
- title: Contribution Calendar — monthly DCA rhythm view
- feature_type: ui
- created_at: 2026-05-18T00:00:00Z
- last_checkpoint: IMPLEMENTING

## User Request
Contribution calendar — show a simple monthly view of when contributions were made and how much. Helps users see their DCA rhythm at a glance without going into the History table.

## Workflow Status
- current_state: IMPLEMENTING
- replanning_used: false
- changes_requested_source: null

## Stages
planning:
  started_at: 2026-05-18T00:00:00Z
  completed_at: 2026-05-18T00:00:00Z
  artifact: docs/superpowers/specs/2026-05-18-contribution-calendar-design.md
  user_approved: true

implementation:
  started_at: 2026-05-18T00:00:00Z
  completed_at: 2026-05-18T00:00:00Z
  artifact: docs/superpowers/plans/2026-05-18-contribution-calendar.md

review:
  started_at: 2026-05-18T00:00:00Z
  completed_at: null
  artifact: null
  iteration: 1

documentation:
  started_at: null
  completed_at: null
  artifact: null

## Acceptance Criteria
- [x] AC-001: A monthly calendar grid shows days where contributions were made
- [x] AC-002: Each contribution day displays the executed amount (€)
- [x] AC-003: User can navigate between months
- [x] AC-004: Calendar is a separate collapsible section from the History Table — users can see DCA rhythm without opening the table (placement decision from brainstorming: History page, two independent collapsible sections)
- [x] AC-005: Responsive and visually consistent with existing UI (Tailwind theme tokens, surface-1/surface-2, existing breakpoints)

## Blockers
<!-- Remove when resolved -->
