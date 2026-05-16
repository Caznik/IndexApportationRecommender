# Rule Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the opaque `rule_triggered` code in the HeroCard subtitle with the human-readable `explanation` text already present in `RecommendationResult`.

**Architecture:** Single-line change in `HeroCard.tsx` — swap `{result.rule_triggered}` for `{result.explanation}` in the subtitle paragraph. `result.explanation` is already available in the component (it's inside the `RecommendationResult` prop). No backend, store, API, or prop changes required.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/HeroCard.tsx` | Swap `result.rule_triggered` → `result.explanation` in subtitle (line ~99) |
| `frontend/src/__tests__/HeroCard.test.tsx` | Add one test asserting `result.explanation` text is visible |

---

### Task 1: Swap rule code for explanation text in HeroCard

**Files:**
- Modify: `frontend/src/components/HeroCard.tsx` (~line 99)
- Test: `frontend/src/__tests__/HeroCard.test.tsx`

---

- [ ] **Step 1: Write the failing test**

Open `frontend/src/__tests__/HeroCard.test.tsx`. The file already has `mockResult` with `explanation: 'Test explanation'`. Add this test inside the `describe('HeroCard', ...)` block, after the existing tests:

```typescript
it('shows explanation text in subtitle', () => {
  render(<HeroCard result={mockResult} baseAmount={500} loading={false} error={null} onGenerate={vi.fn()} />)
  expect(screen.getByText('Test explanation')).toBeInTheDocument()
})
```

---

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend && npx vitest run src/__tests__/HeroCard.test.tsx
```

Expected: `FAIL` — `Unable to find an element with the text: Test explanation`. This confirms the test is wired correctly before the implementation exists.

---

- [ ] **Step 3: Implement the change**

Open `frontend/src/components/HeroCard.tsx`. Find the subtitle paragraph (around line 97–100):

```tsx
          <p className="text-white/70 text-sm mt-2">
            {diffStr && `${diffStr} vs base · `}
            {Number(result.multiplier).toFixed(1)}× · {drawdownStr} drawdown ·{' '}
            <span className="text-white/90">{result.rule_triggered}</span>
          </p>
```

Replace `{result.rule_triggered}` with `{result.explanation}`:

```tsx
          <p className="text-white/70 text-sm mt-2">
            {diffStr && `${diffStr} vs base · `}
            {Number(result.multiplier).toFixed(1)}× · {drawdownStr} drawdown ·{' '}
            <span className="text-white/90">{result.explanation}</span>
          </p>
```

---

- [ ] **Step 4: Run the full test suite to confirm everything passes**

```bash
cd frontend && npm run test:run
```

Expected: all tests pass (currently 60 — this adds 1, so 61 total), 0 failed. Also run lint:

```bash
cd frontend && npm run lint
```

Expected: exit 0, zero violations.

---

## Acceptance Criteria Checklist

- [ ] AC-001: HeroCard subtitle shows `result.explanation` where `result.rule_triggered` used to appear
- [ ] AC-002: The raw code `DD_0_5` (and other `DD_*` codes) is no longer visible in the rendered card
- [ ] AC-003: All 61 frontend tests pass, lint exit 0
