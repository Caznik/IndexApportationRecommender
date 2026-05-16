# Pattern: ESLint flat config for React hooks enforcement (WI-20260516-fixExhaustiveDeps)

## Pattern: Minimal ESLint flat config — hooks only, TS parser, no TS lint rules

When adding ESLint to a Vite + React + TypeScript project (ESLint 9/10), use the flat config format with only the `react-hooks` plugin. Pair it with `@typescript-eslint/parser` for parsing only — no TypeScript lint rules needed unless you specifically want them.

```javascript
// frontend/eslint.config.js
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tsParser from '@typescript-eslint/parser'

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.browser, ...globals.es2020 },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]
```

**Rule:** Use `"lint": "eslint ."` in package.json scripts (not `eslint src/**/*.{ts,tsx}`). Let the `files` pattern in the config scope what gets linted — cross-platform, no shell glob expansion issues.

**Rule:** Always add an `ignores` block for `dist/**` and `coverage/**` when using `eslint .` — ESLint 9+ does not automatically exclude them (only `node_modules` is excluded by default).

## Pattern: Zustand actions are stable deps — always safe to include in useEffect arrays

Zustand action functions (accessed via `useStore((s) => s.actionName)`) are referentially stable across renders — Zustand guarantees this. Including them in `useEffect` dependency arrays satisfies `react-hooks/exhaustive-deps` without causing extra re-runs.

```typescript
// ✅ Correct — fetchSettings is stable, if (!settings) guard prevents re-entrancy
useEffect(() => {
  if (!settings) fetchSettings()
}, [settings, fetchSettings])

// ✅ Correct — fetchHistory is stable, called once on mount
useEffect(() => {
  fetchHistory().finally(() => setHasFetched(true))
}, [fetchHistory])

// ❌ Fragile — works today because Zustand is stable, but violates the rule
useEffect(() => {
  if (!settings) fetchSettings()
}, [])
```

**Rule:** Always declare Zustand actions used inside `useEffect` in the dependency array. The `if (!x)` guard pattern prevents re-entrancy when the effect re-runs after state loads.

## Pattern: useState setters and module-level imports are excluded from dep arrays

Both are stable references that ESLint's `exhaustive-deps` rule correctly excludes:
- `useState` setters (e.g. `setPriceHistory`, `setChartLoading`) — React guarantees stability
- Module-level named imports (e.g. `getPriceHistory` from `'../api'`) — not component-scope values

Do not include these in dep arrays — they add noise without safety benefit.
