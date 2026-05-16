# software-lifecycle Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `software-lifecycle` Claude Code skill that enforces a sequential, gate-driven software development lifecycle for IndexApportationRecommender.

**Architecture:** A single SKILL.md file with the full orchestration protocol, backed by two reference files that Claude copies verbatim when initializing a workitem. No scripts needed — the skill is pure instruction.

**Tech Stack:** Markdown (SKILL.md), Claude Code skill system

**Spec:** `docs/superpowers/specs/2026-05-14-software-lifecycle-design.md`

---

### Task 1: Create skill directory structure

**Files:**
- Create: `.claude/skills/software-lifecycle/SKILL.md`
- Create: `.claude/skills/software-lifecycle/references/source-of-truth-template.md`
- Create: `.claude/skills/software-lifecycle/references/subagent-dispatch-template.md`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p .claude/skills/software-lifecycle/references
```

Expected: directories created, no errors.

- [ ] **Step 2: Verify structure**

```bash
ls .claude/skills/software-lifecycle/
```

Expected output:
```
references/
```

---

### Task 2: Write the source-of-truth reference file

**Files:**
- Create: `.claude/skills/software-lifecycle/references/source-of-truth-template.md`

This file contains the exact template Claude copies into every new workitem.

- [ ] **Step 1: Write the template file**

Create `.claude/skills/software-lifecycle/references/source-of-truth-template.md` with this exact content:

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
- current_state: INTAKE
- replanning_used: false
- changes_requested_source: null

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

---

### Task 3: Write the subagent dispatch reference file

**Files:**
- Create: `.claude/skills/software-lifecycle/references/subagent-dispatch-template.md`

- [ ] **Step 1: Write the template file**

Create `.claude/skills/software-lifecycle/references/subagent-dispatch-template.md` with this exact content:

```markdown
## Context
<!-- List relevant files, modules, and workitem artifacts the subagent needs -->

## Objective
<!-- ONE explicit task only — one sentence -->

## Scope
- Allowed: <!-- specific files or actions permitted -->
- Forbidden: <!-- e.g., do not modify routes | do not change schema | do not expand scope -->

## Output
<!-- Exact artifact path the subagent must write -->

## Expected Response
done -> <artifact-path>
```

---

### Task 4: Write SKILL.md — frontmatter and startup protocol

**Files:**
- Create: `.claude/skills/software-lifecycle/SKILL.md`

- [ ] **Step 1: Write the frontmatter and startup section**

Create `.claude/skills/software-lifecycle/SKILL.md` with the following content (subsequent tasks append to it):

```markdown
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
```

---

### Task 5: Write SKILL.md — workitem system

**Files:**
- Modify: `.claude/skills/software-lifecycle/SKILL.md` (append)

- [ ] **Step 1: Append the workitem system section**

Append to `.claude/skills/software-lifecycle/SKILL.md`:

```markdown

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
```

---

### Task 6: Write SKILL.md — lifecycle phases and gate rule

**Files:**
- Modify: `.claude/skills/software-lifecycle/SKILL.md` (append)

- [ ] **Step 1: Append the lifecycle and gate rule section**

Append to `.claude/skills/software-lifecycle/SKILL.md`:

```markdown

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
```

---

### Task 7: Write SKILL.md — recovery and edge case protocols

**Files:**
- Modify: `.claude/skills/software-lifecycle/SKILL.md` (append)

- [ ] **Step 1: Append recovery protocols**

Append to `.claude/skills/software-lifecycle/SKILL.md`:

```markdown

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

## Definition of Done

A workitem reaches `DONE` only when ALL are true:
- Implementation artifact exists
- Tests exist and pass
- Review artifact exists and is APPROVED
- Documentation artifact exists
- `source_of_truth.md` shows `current_state: DONE` with no unresolved blockers

If any condition is false: not DONE.

## What You Must Never Do

- Write production code or modify `src/` directly
- Advance past a gate without user confirmation
- Skip a phase because the answer seems obvious
- Infer workflow state from chat or memory — only from `source_of_truth.md`
- Delegate vague or multi-objective tasks to subagents
- Allow scope creep or accept undocumented changes
- Overwrite artifact paths — always append `_v2`, `_v3`

## Subagent Delegation

Every subagent dispatch must use the template in `references/subagent-dispatch-template.md`. Subagents return only:

```
done -> <artifact-path>
```

They do not summarize in chat, do not return large results inline, and do not expand scope.
```

---

### Task 8: Verify the skill

**Files:**
- Read: `.claude/skills/software-lifecycle/SKILL.md` (verify completeness)

- [ ] **Step 1: Check SKILL.md renders correctly**

Read the complete `.claude/skills/software-lifecycle/SKILL.md` and verify:
- Frontmatter has `name` and `description` fields
- All 5 phases are present (INTAKE, PLANNING, IMPLEMENTING, REVIEWING, DOCUMENTING)
- The gate rule is present and unambiguous
- Both reference files are mentioned with their correct paths
- No `TBD`, `TODO`, or placeholder text remains

- [ ] **Step 2: Check reference files exist**

```bash
ls .claude/skills/software-lifecycle/references/
```

Expected:
```
source-of-truth-template.md
subagent-dispatch-template.md
```

- [ ] **Step 3: Verify SKILL.md line count is reasonable**

```bash
wc -l .claude/skills/software-lifecycle/SKILL.md
```

Expected: under 300 lines (the skill body should be scannable in one read).

---

## Self-Review

**Spec coverage check:**
- ✅ Skill identity & trigger → Task 4 (frontmatter + description)
- ✅ Workitem structure & naming → Task 5
- ✅ Lifecycle phases (all 5) → Task 6
- ✅ Gate rule → Task 6
- ✅ Source of Truth template → Task 2
- ✅ Subagent dispatch template → Task 3
- ✅ Startup / resume protocol → Task 4
- ✅ Interrupted recovery → Task 7
- ✅ Replanning protocol → Task 7
- ✅ Changes Requested protocol → Task 7
- ✅ Definition of Done → Task 7
- ✅ Superpowers integration map → Tasks 4, 6 (inline per phase)
- ✅ What Claude must never do → Task 7

**Placeholder scan:** No TBDs, no "implement later", no vague steps. All steps include exact content.

**Type consistency:** No function signatures or types — this is a Markdown skill, not code. No consistency issues.
