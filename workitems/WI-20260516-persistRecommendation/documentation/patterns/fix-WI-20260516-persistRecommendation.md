# Pattern: Restoring In-Memory Store State from an Existing API on Mount

**Workitem:** WI-20260516-persistRecommendation

## Problem

Zustand stores are in-memory only. A page refresh resets all state to initial values. When a REST API already holds the data needed to restore that state, a mount-time fetch can transparently reload it without any backend changes.

## Solution Pattern

### 1. New store action for best-effort restore

```typescript
restoreRecommendation: async () => {
  if (get().recommendation !== null) return   // guard: don't overwrite live state
  try {
    const history = await api.getHistory()
    if (history.length === 0) return
    const latest = history[0]
    set({
      recommendation: { ...mappedFields },
      recommendationRestoredAt: latest.created_at,
    })
  } catch {
    // silent — restoration is best-effort; user can always retry via primary action
  }
},
```

Key rules:
- **No loading/error state** — restoration is silent. Do not block the UI.
- **Guard first** — check before any async work to prevent overwriting a fresh result.
- **Silent catch** — the user has another path (Generate button). Don't pollute error state.
- **Use `(set, get)`** — the guard requires reading current state.

### 2. Clear the restored timestamp when the primary action succeeds

```typescript
generate: async () => {
  // ...
  set({ recommendation, recommendationLoading: false, recommendationRestoredAt: null })
}
```

This ensures any "stale" indicator (age label) disappears when fresh data arrives.

### 3. Mount effect in the consumer component

```typescript
useEffect(() => {
  if (!recommendation) restoreRecommendation()
}, [recommendation, restoreRecommendation])
```

- `recommendation` in the dep array satisfies `exhaustive-deps`. The guard inside the action prevents re-entrancy if `recommendation` transitions back to null.
- Both `restoreRecommendation` (Zustand action) refs are stable across renders — safe in dep arrays.

### 4. Age label for restored data

```tsx
{restoredAt && (
  <span className="text-white/40 text-xs">
    · generated {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(restoredAt))}
  </span>
)}
```

Use `Intl.DateTimeFormat` — no manual string splitting. Style identically to other secondary indicators.

## Testing

Unit tests for the store action (in `store.test.ts`):
1. Guard — `recommendation` already set → `getHistory` not called
2. Empty array → state unchanged
3. API failure → state unchanged, no error state
4. Success → correct field mapping, `restoredAt` set

Integration tests (in `Dashboard.test.tsx`):
1. Default `getHistory` mock to `[]` in `beforeEach` — prevents unhandled rejections in existing tests
2. Test restore: `getHistory` → `[mockRecord]` → assert rendered value visible
3. Test age label: same setup → assert `/generated [month]/i` text
4. Test empty state: `getHistory` → `[]` → assert "No recommendation yet"

## Field Mapping Note

When the API type uses a different field name than the store type, map explicitly in the action:

```typescript
// RecommendationRecord.market_price → RecommendationResult.current_price
current_price: latest.market_price,
```

All other fields had identical names and were passed through directly.
