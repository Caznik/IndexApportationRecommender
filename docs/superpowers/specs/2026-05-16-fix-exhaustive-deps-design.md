# Fix React Hook exhaustive-deps — Design Spec

**Workitem:** WI-20260516-fixExhaustiveDeps  
**Date:** 2026-05-16  
**Feature type:** fix

---

## Goal

Fix the missing `fetchSettings` (and `settings`) dependency in the `useEffect` inside `Dashboard.tsx`, and add the `react-hooks/exhaustive-deps` ESLint rule so this class of bug is caught automatically in future.

## Problem Statement

`Dashboard.tsx` has a `useEffect` that reads `settings` and calls `fetchSettings()` but declares an empty dependency array `[]`:

```typescript
useEffect(() => {
  if (!settings) fetchSettings()
}, [])
```

This works today because Zustand action references are stable across renders, but it violates the Rules of Hooks contract and will silently break if the effect is refactored or the hook dependency changes. No automated tool currently catches this.

---

## Architecture

Two independent changes, applied together:

### 1. Dep array fix — `frontend/src/pages/Dashboard.tsx`

Change the dependency array to include both consumed identifiers:

```typescript
useEffect(() => {
  if (!settings) fetchSettings()
}, [settings, fetchSettings])
```

**Safety:** Zustand action references are stable (referentially equal across renders). The `if (!settings)` guard prevents re-entrancy: if the effect re-runs after settings loads, the condition is false and `fetchSettings` is not called again. No observable behavior change.

### 2. ESLint setup — `frontend/`

**Packages to install (devDependencies):**
- `eslint` — core linter
- `eslint-plugin-react-hooks` — `rules-of-hooks` + `exhaustive-deps` rules
- `globals` — browser/ES2020 global name sets for flat config

**New file: `frontend/eslint.config.js`**

```javascript
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.es2020 } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]
```

Scope: `src/**/*.{ts,tsx}` only — no config, test, or build files. Both hooks rules enabled at `error` severity.

**`package.json` script addition:**
```json
"lint": "eslint src"
```

---

## Verification

- `npm run lint` (or `npx eslint src`) exits 0 with zero violations after the dep fix
- `npm run test:run` still reports 53/53 passing (no behavior change)

---

## Out of Scope

- TypeScript ESLint rules (`@typescript-eslint/*`) — separate workitem if wanted
- CI/CD integration of the lint script — not currently in scope
- Fixing any other files — the dep fix is isolated to `Dashboard.tsx`
