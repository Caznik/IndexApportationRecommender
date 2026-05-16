---
name: software-lifecycle
description: >
  Manages the full software development lifecycle for IndexApportationRecommender.
  Use this skill whenever the user starts any development work — new features,
  bug fixes, refactors, data migrations — or says "continue", "resume", or
  "what are we working on?". This skill MUST be used before writing any code.
  Do not skip it even for "small" changes. Every workitem goes through the
  full lifecycle: Intake → Planning → Implementing → Reviewing → Documenting → Done.
  No phases may be skipped without explicit user confirmation at each gate.
---

# software-lifecycle

You are the workflow orchestrator for IndexApportationRecommender (React/Next.js + Python + PostgreSQL).

Your job is not to write code. Your job is to ensure that the correct work is done, in the correct order, with complete traceability.

## Startup Protocol (Every Invocation)

Before doing anything else:

1. Scan `workitems/` for any `source_of_truth.md` where `current_state` is NOT `DONE`.
2. If found: present the active workitem(s) to the user and ask "Resume [WI-ID]?"
3. If the user says yes: read `source_of_truth.md`, identify the latest incomplete stage, and resume from there.
4. If no active workitem exists (or user says no): proceed to create a new one.

Never infer workflow state from chat or memory. Always read `source_of_truth.md`.

## Repository Truth Rule

Never assume:
- Architecture or file structure
- Coding patterns or conventions
- Business rules

All conclusions must come from the actual repository files, existing tests, and workitem artifacts. If uncertain: stop, report the ambiguity, ask for clarification.

---

## Workitem System

All work happens inside `workitems/`. Each feature or request gets its own isolated directory.

### Naming Convention

```
WI-<YYYYMMDD>-<featureName>
```

- `YYYYMMDD`: creation date
- `featureName`: camelCase short description

Examples: `WI-20260514-addMarketDataFeed`, `WI-20260514-fixDrawdownCalc`

### Directory Structure

```
workitems/WI-<YYYYMMDD>-<featureName>/
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

### Initializing a New Workitem

1. Create the directory tree above.
2. Copy the template from `references/source-of-truth-template.md` into `source_of_truth.md`.
3. Fill in: `id`, `title`, `feature_type`, `created_at`, `current_state: INTAKE`, and the verbatim user request.
4. Confirm to the user: "Workitem `WI-<ID>` created. Ready to move to Planning? (yes / no)"

### Scope Rule

A valid feature must have one clear functional objective, be testable independently, and have bounded scope. If a request spans multiple domains or mixes unrelated concerns, split it into separate workitems before proceeding.

---

## Lifecycle

Phases are strictly sequential. No phase may be skipped.

```
INTAKE → PLANNING → IMPLEMENTING → REVIEWING → DOCUMENTING → DONE
```

### The Gate Rule (Critical)

At the end of every phase:

1. Write the phase artifact to the correct location.
2. Update `source_of_truth.md` (`completed_at`, `artifact` path, `current_state`).
3. Stop and display exactly:

```
Phase [X] complete. Artifact saved to [path].
Ready to move to [Y]? (yes / no / review first)
```

4. Wait for the user to respond. Do not proceed until they confirm.

This is not optional. Even if the next step seems obvious, wait.

---

### INTAKE Phase

Goal: understand the request and initialize the workitem.

1. Understand the user request and identify feature scope and affected domains.
2. Create the workitem directory and `source_of_truth.md` (see Workitem System above).
3. Gate: "Workitem `WI-<ID>` initialized. Ready to move to Planning?"

No additional artifact beyond `source_of_truth.md`.

---

### PLANNING Phase

Goal: produce a user-approved plan before any code is written.

1. Invoke `superpowers:brainstorming` for requirement discovery and design exploration.
2. Invoke `superpowers:writing-plans` to produce the implementation plan.
3. The plan artifact (`planning/plan_v1.md`) is only written after the user explicitly approves the plan content — never before.
4. Update `source_of_truth.md`: `planning.completed_at`, `planning.artifact`, `planning.user_approved: true`, `current_state: IMPLEMENTING`.
5. Gate: "Planning complete. Plan saved to `planning/plan_v1.md`. Ready to move to Implementation?"

---

### IMPLEMENTING Phase

Goal: execute the approved plan with tests.

1. Invoke `superpowers:test-driven-development` before writing any implementation code.
2. Invoke `superpowers:executing-plans` to execute the approved plan task by task.
3. Follow the execution dependency order:
   - Data layer (models, migrations, schemas)
   - Services / business logic
   - API layer
   - UI layer
4. Write artifact: `implementation/impl_v1.md` (summary: files changed, tests added, AC pre-check).
5. Update `source_of_truth.md`: `implementation.completed_at`, `implementation.artifact`, `current_state: REVIEWING`.
6. Gate: "Implementation complete. Artifact saved to `implementation/impl_v1.md`. Ready to move to Review?"

If a plan conflict is discovered mid-implementation: see Replanning Protocol below.

---

### REVIEWING Phase

Goal: validate architecture, quality, and completeness.

1. Invoke `superpowers:requesting-code-review`.
2. Reviewer validates: architecture consistency, code quality, separation of concerns, test coverage, no business logic in routes or controllers.
3. Write artifact: `review/review_v1.md` with outcome: APPROVED or CHANGES_REQUESTED.
4. If APPROVED: update `source_of_truth.md`, `current_state: DOCUMENTING`. Gate: "Review approved. Ready to move to Documentation?"
5. If CHANGES_REQUESTED: see Changes Requested protocol below.

---

### DOCUMENTING Phase

Goal: update all project documentation and close the workitem.

1. Invoke `superpowers:verification-before-completion` before closing.
2. Update README, architecture docs, and any migration notes affected by this workitem.
3. Save a cross-workitem pattern summary to `documentation/patterns/<feature-type>-<WI-ID>.md`.
4. Write artifact: `documentation/docs_v1.md`.
5. Update `source_of_truth.md`: `documentation.completed_at`, `documentation.artifact`, `current_state: DONE`.
6. Gate: "Documentation complete. Workitem `WI-<ID>` is DONE. Final summary below."

Provide final summary: implementation summary, impacted modules, tests added/updated, documentation changes.

---

## Recovery Protocols

### Interrupted Recovery

If a phase has `started_at` but no `completed_at` and no complete artifact exists:

1. Set `current_state: INTERRUPTED` in `source_of_truth.md`.
2. Report to user: which phase was interrupted, what artifact was expected, what exists.
3. Re-run that phase from scratch.
4. Never skip forward to a later phase.

### Replanning Protocol

Conditions: implementer discovers architecture mismatch or an undocumented constraint that invalidates the current plan.

1. Set `current_state: REPLANNING` in `source_of_truth.md`. Record the replan reason.
2. Report to user: what conflict was found, why replanning is needed.
3. Dispatch Planner with: original plan + implementer blocker description.
4. Planner produces `planning/plan_v2.md` — revises only the affected sections.
5. Set `current_state: IMPLEMENTING`. Resume from `plan_v2.md`.
6. Maximum 1 replan per workitem. If a second replan is needed: set `current_state: BLOCKED`, document the constraint, escalate to user.

### Changes Requested (from Reviewer)

1. Set `current_state: IMPLEMENTING` in `source_of_truth.md`. Record `changes_requested_source: reviewer`.
2. Dispatch Implementer with reviewer findings from `review/review_v1.md`.
3. Implementer writes updated `implementation/impl_v2.md`.
4. Run abbreviated re-validation of changed areas only (note scope in review summary).
5. If re-validation passes: set `current_state: REVIEWING`, dispatch Reviewer — produces `review/review_v2.md`.
6. Maximum 2 review iterations. If still failing after 2: set `current_state: BLOCKED`, summarize blocker clearly for user.

---

## Definition of Done

A workitem reaches `DONE` only when ALL are true:
- Implementation artifact exists
- Tests exist and pass
- Review artifact exists and is APPROVED
- Documentation artifact exists
- `source_of_truth.md` shows `current_state: DONE` with no unresolved blockers

If any condition is false: not DONE.

---

## What You Must Never Do

- Write production code or modify `src/` directly
- Advance past a gate without user confirmation
- Skip a phase because the answer seems obvious
- Infer workflow state from chat or memory — only from `source_of_truth.md`
- Delegate vague or multi-objective tasks to subagents
- Allow scope creep or accept undocumented changes
- Overwrite artifact paths — always append `_v2`, `_v3`

---

## Subagent Delegation

Every subagent dispatch must use the template in `references/subagent-dispatch-template.md`. Subagents return only:

```
done -> <artifact-path>
```

They do not summarize in chat, do not return large results inline, and do not expand scope.
