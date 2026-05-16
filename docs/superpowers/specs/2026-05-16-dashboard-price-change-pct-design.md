# Design: Dashboard Price Change Percentages

**Date:** 2026-05-16  
**Workitem:** WI-20260516-dashboardPriceChangePct

## Summary

Add two price-change pill badges inside the HeroCard showing how the fund price has moved compared to yesterday and the previous month. No backend changes required — all data is derived from the existing `/api/market/history` response already fetched on the Dashboard.

## Placement

Option B: inside the HeroCard result branch, below the existing subtitle line (`+€0 vs base · 1.0× · -65.0% drawdown · DD_0_5`). Badges are only shown when a recommendation result is present. The three existing StatCards remain unchanged.

## Data Computation

Computed in `Dashboard.tsx` from the already-fetched `priceHistory: PricePoint[]` array (sorted oldest → newest by `date`).

```
pctDay   = (last.close_price - prev.close_price) / prev.close_price
           where prev = priceHistory[length - 2]

pctMonth = (last.close_price - monthAgo.close_price) / monthAgo.close_price
           where monthAgo = last entry with date <= (last.date - 30 calendar days)
```

Both return `null` when the array is too short to satisfy the window (< 2 entries for `pctDay`, no entry found 30+ days back for `pctMonth`).

A helper function `computePriceChanges(history: PricePoint[])` encapsulates this logic and returns `{ pctDay: number | null, pctMonth: number | null }`.

## Component Changes

### `Dashboard.tsx`
- After `priceHistory` is set in state, call `computePriceChanges(priceHistory)`.
- Pass `pctDay` and `pctMonth` as new props to `<HeroCard>`.

### `HeroCard.tsx`
- Add `pctDay: number | null` and `pctMonth: number | null` to the `Props` interface.
- In the result branch, render two pill badges below the subtitle `<p>`:
  - Label: `1d` / `1m`
  - Value formatted to one decimal place with sign (`+1.4%` / `-3.2%`)
  - Color: green (`text-green-400`) when positive, red (`text-red-400`) when negative, muted (`text-white/50`) when zero
  - Shows `—` when the value is `null`

## Error / Fallback Handling

- If `priceHistory` is empty or loading, both values are `null` → badges show `—`.
- If `priceHistory` has only one entry, `pctDay` is `null`.
- If no entry exists 30+ calendar days before the most recent, `pctMonth` is `null`.
- No spinner or skeleton needed for the badges — `—` is sufficient.

## Testing

- Unit tests for `computePriceChanges`: normal case, single-entry array, empty array, no 30-day-old entry found.
- HeroCard snapshot/render tests: badges visible with positive/negative/null values; correct color classes applied.
- No new API tests needed.

## Out of Scope

- Live intraday price vs historical close comparison (uses close-to-close only)
- Backend changes
- New API endpoints
- Changes to StatCards, PriceChart, or History pages
