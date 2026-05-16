# Documentation — WI-20260516-ruleExplanation

## Implementation Summary

Replaced the opaque `rule_triggered` engine code (e.g. `DD_0_5`) in the HeroCard subtitle with the human-readable `explanation` field already returned by the API. One-line change in `HeroCard.tsx`; one new test in `HeroCard.test.tsx`.

## Impacted Modules

| Module | Change |
|--------|--------|
| `frontend/src/components/HeroCard.tsx` | Line 99: `{result.rule_triggered}` → `{result.explanation}` in subtitle span |
| `frontend/src/__tests__/HeroCard.test.tsx` | Added test "shows explanation text in subtitle" |

## Tests Added / Updated

| File | Change |
|------|--------|
| `frontend/src/__tests__/HeroCard.test.tsx` | +1 test: asserts `result.explanation` text is visible in the rendered subtitle |

Total: 61 tests (was 60 before this workitem).

## Documentation Changes

- Added pattern summary: `documentation/patterns/enhancement-WI-20260516-ruleExplanation.md`

## How to Verify

```
cd frontend
npm run test:run   # 61 passed, 0 failed
npm run lint       # exit 0
```
