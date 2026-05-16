# Pattern: Surfacing an Existing API Field That Was Previously Hidden

**Workitem:** WI-20260516-ruleExplanation

## Problem

A component renders an opaque internal identifier from an API response (e.g. `DD_0_5`) when a human-readable equivalent (`explanation`) is already present in the same response object but unused in the UI.

## Solution Pattern

### 1. Identify the unused field

Check the API response type for fields that contain human-readable equivalents of what is being displayed. In this case, `RecommendationResult` had both `rule_triggered: string` (internal code) and `explanation: string` (human sentence) — but only `rule_triggered` was rendered.

### 2. Swap the rendered field — one line

```tsx
// Before
<span className="text-white/90">{result.rule_triggered}</span>

// After
<span className="text-white/90">{result.explanation}</span>
```

No prop changes, no store changes, no backend changes. The field was already flowing through the data pipeline.

### 3. Test: assert the human-readable text is in the DOM

```typescript
it('shows explanation text in subtitle', () => {
  render(<HeroCard result={mockResult} baseAmount={500} loading={false} error={null} onGenerate={vi.fn()} />)
  expect(screen.getByText('Test explanation')).toBeInTheDocument()
})
```

Use `getByText` (real DOM assertion) rather than checking props. If the field was already in `mockResult`, no fixture changes are needed.

## Key Rules

- **Check the type first** — often the backend already returns what you need; no backend change required.
- **Don't remove the old field from the type/API** — it may be used for data analysis, stored in the DB, or needed by other consumers. Just stop rendering it.
- **The test fixture may already be ready** — if `mockResult` had the field set (even to empty string), update it to a recognizable value and assert on it.
