# Review — WI-20260516-dashboardPriceChangePct

## Outcome: APPROVED

Final reviewer verdict: **Ready to merge — Yes**

## Strengths

- Clean utility boundary — `computePriceChanges` is pure, well-typed, correct boundary handling
- Backward-compatible optional props on HeroCard
- Badge rendering correctly scoped to result branch only
- Zero handled distinctly (`0.0%` unsigned, muted colour)
- Test coverage proportionate: 7 unit, 4 component, 2 integration tests

## Issues Found and Resolved

| Issue | Severity | Resolution |
|-------|----------|------------|
| Zero value showed `+0.0%` (sign inconsistent with muted colour) | Important | Fixed: explicit `value === 0` branch returns `0.0%` |
| Test coupled to generate action (false dependency) | Important | Fixed: pre-seed recommendation via `useStore.setState` |
| Missing `pctMonth` integration test | Important | Fixed: added 3-entry fixture with 30-day anchor |
| Misleading comment in test fixture | Important | Fixed: comment now says "boundary included" |
| Missing sparse-data test (prev === monthAgo) | Important | Fixed: added 7th unit test |
| Undocumented zero-price assumption | Minor | Fixed: JSDoc added to `computePriceChanges` |

## Remaining Notes (accepted trade-offs)

- Badges flash `— / —` on initial render before `priceHistory` loads (no loading shimmer for badges — design decision, AC-004 accepts dashes)
- Colour classes not asserted in tests (Tailwind class assertions are brittle; verified by code inspection)
