# Design: software-lifecycle Skill

**Date:** 2026-05-14
**Project:** IndexApportationRecommender
**Stack:** React/Next.js + Python + PostgreSQL

---

## Problem Statement

The original `leader.md` agent conflicted with Claude's own agency, leading to non-deterministic phase skipping. The goal is a Claude Code **skill** that guides orchestration behavior — enforcing sequential phases with explicit user-confirmed gates — rather than trying to replace Claude's agency.

---

## Skill Identity

- **Name:** `software-lifecycle`
- **Triggers:** Any development work (new features, bug fixes, refactors, migrations). Also on "continue", "resume", "what are we working on?" when an active workitem may exist. Does NOT trigger for purely conversational or exploratory questions.
- **Core discipline:** Every phase produces a documented artifact. Claude stops at every gate and waits for explicit user confirmation before advancing. No exceptions.

---

## Workitem Structure

```
workitems/
└── WI-<YYYYMMDD>-<featureName>/
    ├── source_of_truth.md
    ├── planning/
    │   └── plan_v1.md
    ├── implementation/
    │   └── impl_v1.md
    ├── review/
    │   └── review_v1.md
    └── documentation/
        └── docs_v1.md
```

**Naming convention:** `WI-<YYYYMMDD>-<featureName>` where featureName is camelCase (e.g., `WI-20260514-addMarketDataFeed`).

**Startup rule:** On every invocation, scan `workitems/` for any workitem with a non-`DONE` state in `source_of_truth.md`. Offer to resume before creating a new workitem.

---

## Lifecycle Phases & Gates

Phases are strictly sequential:

```
INTAKE → PLANNING → IMPLEMENTING → REVIEWING → DOCUMENTING → DONE
```

### Gate Rule

At the end of each phase, Claude:
1. Writes the phase artifact to the correct location
2. Updates `source_of_truth.md`
3. Stops and displays:

```
Phase [X] complete. Artifact saved to [path].
Ready to move to [Y]? (yes / no / review first)
```

Claude waits. It does not proceed until the user confirms.

### Phase Descriptions

**INTAKE**
- Understand user request
- Identify feature scope and affected domains
- Create workitem directory and initialize `source_of_truth.md`
- No artifact beyond `source_of_truth.md` — gate opens immediately after init

**PLANNING**
- Invoke `superpowers:brainstorming` for requirement discovery and design
- Invoke `superpowers:writing-plans` for the implementation plan
- Output: `planning/plan_v1.md`
- Plan artifact is only written after user explicitly approves the plan content

**IMPLEMENTING**
- Invoke `superpowers:test-driven-development` before writing any code
- Invoke `superpowers:executing-plans` to execute the approved plan
- Output: `implementation/impl_v1.md` (summary of changes made)
- If plan conflict discovered mid-implementation → REPLANNING (see below)

**REVIEWING**
- Invoke `superpowers:requesting-code-review`
- Reviewer validates: architecture consistency, code quality, separation of concerns, test coverage, no business logic in routes
- Output: `review/review_v1.md` (APPROVED or CHANGES_REQUESTED)
- If CHANGES_REQUESTED → return to IMPLEMENTING, increment iteration

**DOCUMENTING**
- Invoke `superpowers:verification-before-completion` before closing
- Update README, architecture docs, migration notes
- Save cross-workitem pattern summary to `documentation/patterns/<type>-<WI-ID>.md`
- Output: `documentation/docs_v1.md`

### Interrupted Recovery

If a phase has `started_at` but no `completed_at` and no complete artifact exists:
- Set state to `INTERRUPTED`
- Report: which phase, what artifact was expected, what was found
- Re-run that phase from scratch
- Never skip forward

### Replanning Protocol

Conditions: implementer discovers architecture mismatch or undocumented constraint that invalidates the plan.
- Maximum 1 replan per workitem
- Set state to `REPLANNING`, flag to user, return to PLANNING
- Planner produces `plan_v2.md` (revises only affected sections)
- If a second replan is needed: set `BLOCKED`, escalate to user

### Changes Requested Re-entry

- Set state to `IMPLEMENTING`
- Dispatch implementer with reviewer findings
- After fix: abbreviated re-validation of changed areas only
- After QA pass: set `UNDER_REVIEW`, dispatch reviewer again (produces `review_v2.md`)

### Retry Limit

Maximum 2 review iterations. If still failing after 2: mark `BLOCKED`, summarize blocker clearly for user.

---

## Source of Truth Template

```markdown
# Source of Truth

## Metadata
- id: WI-<YYYYMMDD>-<featureName>
- title: <short human-readable description>
- feature_type: api | ui | data | migration | fix | refactor | other
- created_at: <ISO 8601>
- last_checkpoint: <last phase that produced a complete artifact>

## User Request
<verbatim original request>

## Workflow Status
- current_state: INTAKE | PLANNING | REPLANNING | IMPLEMENTING | REVIEWING | DOCUMENTING | DONE | BLOCKED | INTERRUPTED
- replanning_used: false
- changes_requested_source: null  # "reviewer" | null

## Stages
planning:
  started_at: null
  completed_at: null
  artifact: null
  user_approved: false

implementation:
  started_at: null
  completed_at: null
  artifact: null

review:
  started_at: null
  completed_at: null
  artifact: null
  iteration: 1

documentation:
  started_at: null
  completed_at: null
  artifact: null

## Acceptance Criteria
- [ ] AC-001: <criterion>

## Blockers
<!-- Remove when resolved -->
```

Update rules:
- After every phase completion
- After every gate
- After every retry
- After every blocker
- Never overwrite artifact paths — append `_v2`, `_v3`

---

## Delegation Model

Claude is the orchestrator only. It invokes superpowers skills and delegates to subagents. It never writes production code, modifies `src/` directly, or skips phases.

### Subagent Dispatch Template

```
## Context
Relevant files, modules, workitem artifacts.

## Objective
ONE explicit task only.

## Scope
- Allowed: [specific files/actions]
- Forbidden: [do not modify routes | do not change schema | do not expand scope]

## Output
Exact artifact path.

## Expected Response
done -> <artifact-path>
```

Subagents return only `done -> <path>`. No chat summaries. No scope expansion.

---

## Execution Dependency Order

When implementing, always follow this order:

1. Data layer (models, migrations, schemas)
2. Services / business logic
3. API layer
4. UI layer
5. Documentation
6. Validation

---

## Definition of Done

A workitem is `DONE` only when ALL are true:
- Implementation artifact exists
- Tests exist and pass
- Review artifact exists and is APPROVED
- Documentation artifact exists
- `source_of_truth.md` updated
- No unresolved blockers

---

## Superpowers Integration Map

| Phase | Skill(s) Invoked |
|-------|-----------------|
| PLANNING | `superpowers:brainstorming`, `superpowers:writing-plans` |
| IMPLEMENTING | `superpowers:test-driven-development`, `superpowers:executing-plans` |
| REVIEWING | `superpowers:requesting-code-review` |
| DOCUMENTING | `superpowers:verification-before-completion` |

---

## What Claude Must Never Do

- Write production code directly
- Modify `src/` without going through the implementation phase
- Skip a phase because it seems obvious
- Advance past a gate without user confirmation
- Infer workflow state from chat or memory — only from `source_of_truth.md`
- Delegate vague tasks
- Allow scope creep
- Overwrite workflow history silently
