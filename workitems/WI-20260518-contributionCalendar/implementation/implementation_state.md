# Implementation State — WI-20260518-contributionCalendar

## Workflow Ownership
APPROVED

---

## Implementer Section

### Task
Task 2: ContributionCalendar component — grid rendering and month navigation (no tooltip).

### Files Delivered
- `frontend/src/components/ContributionCalendar.tsx`
- `frontend/src/__tests__/ContributionCalendar.test.tsx`

### Implementer Notes
- 6/6 new tests pass, 91/91 total (no regressions)
- Used `vi.useFakeTimers({ toFake: ['Date'] })` to avoid `userEvent` hanging when all timers are faked

---

<!-- QA appends below this line -->

## Iteration 1

### QA Review Summary

Full independent verification performed. Both implementation files were read directly and test suite was executed. All 6 specified tests pass. No regressions introduced (91/91). Implementation is spec-compliant on every verified point. This is a clean first-pass approval.

---

### QA Findings

No findings. No CRITICAL, MAJOR, MINOR, or SUGGESTION items.

---

### AC Validation

The source_of_truth.md for this workitem is still in INTAKE state and contains high-level AC items that predate the detailed task specification provided for this review. The task specification provides the authoritative requirements. AC items are mapped accordingly.

AC-001: Monthly calendar grid shows days where contributions were made
  Status: PASS
  Evidence: `frontend/src/components/ContributionCalendar.tsx:69-98` — 6x7 grid renders CalendarDay cells; executed cells (`cell.record !== null`) render at lines 85-95.

AC-002: Each contribution day displays the executed amount
  Status: PASS
  Evidence: `frontend/src/components/ContributionCalendar.tsx:92` — `€{Number(cell.record.executed_amount).toFixed(0)}` rendered in accent color. Confirmed by test at `frontend/src/__tests__/ContributionCalendar.test.tsx:39`.

AC-003: User can navigate between months
  Status: PASS
  Evidence: Prev (`‹`) button at line 41 and Next (`›`) button at line 49 of `ContributionCalendar.tsx`. Navigation to April 2026 confirmed by test at `ContributionCalendar.test.tsx:49-54`.

Task-specific AC items from the detailed specification:

T-AC-001: Shows current month label on mount formatted as "MAY 2026" (uppercase, en-US locale)
  Status: PASS
  Evidence: `ContributionCalendar.tsx:20-22` — `toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()` produces "MAY 2026". Runtime-verified via Node.js. Test: `ContributionCalendar.test.tsx:29-33`.

T-AC-002: Prev button has aria-label="Previous month", Next has aria-label="Next month"
  Status: PASS
  Evidence: `ContributionCalendar.tsx:43` and `ContributionCalendar.tsx:51`.

T-AC-003: Next button is disabled when currentMonth is the current calendar month
  Status: PASS
  Evidence: `ContributionCalendar.tsx:51` — `disabled={isCurrentMonth}`. Test: `ContributionCalendar.test.tsx:56-60`.

T-AC-004: Imports buildDayMap and buildCalendarWeeks from ../utils/calendarGrid (no reimplementation)
  Status: PASS
  Evidence: `ContributionCalendar.tsx:3` — `import { buildCalendarWeeks, buildDayMap } from '../utils/calendarGrid'`.

T-AC-005: Day-of-week headers render Su Mo Tu We Th Fr Sa
  Status: PASS
  Evidence: `ContributionCalendar.tsx:9` — `const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']`; rendered at lines 61-66.

T-AC-006: Null cells render as empty divs, plain days show day number in muted text, executed days show day number + euro amount
  Status: PASS
  Evidence: `ContributionCalendar.tsx:72-95`.

T-AC-007: NO tooltip logic in this file
  Status: PASS
  Evidence: grep for `tooltip`, `onMouseEnter`, `onMouseLeave`, `title=` — no matches found.

T-AC-008: currentMonth state initialized to first day of current calendar month
  Status: PASS
  Evidence: `ContributionCalendar.tsx:13-15` — `useState(() => new Date(now.getFullYear(), now.getMonth(), 1))`.

T-AC-009: vi.useFakeTimers({ toFake: ['Date'] }) deviation is acceptable
  Status: PASS
  Evidence: `ContributionCalendar.test.tsx:23` — documented rationale at line 21 ("Only fake Date so that setTimeout/Promise timers used by userEvent still work"). Spec explicitly notes this is an acceptable deviation. Functional behavior of all 6 tests is unaffected.

T-AC-010: No extra features beyond spec
  Status: PASS
  Evidence: File is 101 lines. No tooltip state, no extra props, no speculative abstractions.

---

### Validation Results

- [x] requirements implemented
- [x] tests exist and adequate — 6 tests covering all specified behaviors
- [x] conventions respected — component in `components/`, test in `__tests__/`, named export, typed props
- [x] architecture respected — grid logic stays in `calendarGrid.ts` utility, component only renders
- [x] scope respected — no tooltip, no unrelated changes
- [x] all AC PASS

---

### Final QA Decision

APPROVED
