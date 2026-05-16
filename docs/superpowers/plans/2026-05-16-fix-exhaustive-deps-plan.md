# Fix React Hook exhaustive-deps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `react-hooks/exhaustive-deps` ESLint rule to the frontend and fix all missing hook dependencies across the three page components.

**Architecture:** Install a minimal ESLint flat config (hooks plugin + TS parser, no TS lint rules). Verify the rule catches the three existing violations (Dashboard, Settings, History), then fix all dep arrays in one pass and confirm zero violations. All 53 existing unit tests continue to pass with no behavior change — Zustand action references are stable across renders.

**Tech Stack:** ESLint 9 (flat config), eslint-plugin-react-hooks v5+, @typescript-eslint/parser (TSX parsing only, no lint rules), globals, Vitest (existing test suite).

**Scope note:** The spec named only `Dashboard.tsx`, but enabling the rule reveals the same pattern in `Settings.tsx` (line 35) and `History.tsx` (line 15). All three must be fixed — leaving the others unfixed would leave the lint script failing.

---

### Task 1: Install ESLint, create flat config, verify RED

**Files:**
- Modify: `frontend/package.json` — add devDependencies + lint script
- Create: `frontend/eslint.config.js`

- [ ] **Step 1: Install ESLint packages**

Run from inside `frontend/`:

```
npm install --save-dev eslint eslint-plugin-react-hooks @typescript-eslint/parser globals
```

Expected: exits 0. `package.json` now has these four packages under `devDependencies`. `node_modules/` is updated.

Note: `@typescript-eslint/parser` is required because ESLint's default parser (espree) cannot parse TypeScript/TSX syntax. We use it only for parsing — no TypeScript lint rules are enabled.

- [ ] **Step 2: Add the lint script to package.json**

In `frontend/package.json`, add `"lint": "eslint src"` to the `"scripts"` object. The full scripts block becomes:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "lint": "eslint src"
},
```

- [ ] **Step 3: Create eslint.config.js**

Create `frontend/eslint.config.js` with this exact content:

```javascript
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tsParser from '@typescript-eslint/parser'

export default [
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

- [ ] **Step 4: Verify ESLint catches the existing violations (RED)**

Run from `frontend/`:

```
npm run lint
```

Expected: exits non-zero. Output must include `exhaustive-deps` errors in all three files:

```
frontend/src/pages/Dashboard.tsx
  22:3  error  React Hook useEffect contains a call to 'fetchSettings'...  react-hooks/exhaustive-deps

frontend/src/pages/Settings.tsx
  33:3  error  React Hook useEffect contains a call to 'fetchSettings'...  react-hooks/exhaustive-deps

frontend/src/pages/History.tsx
  13:3  error  React Hook useEffect contains a call to 'fetchHistory'...   react-hooks/exhaustive-deps
```

(Line numbers and exact wording may vary slightly. The key is: three `exhaustive-deps` errors, one per file.)

If ESLint exits 0 (no errors): the config is not loading — stop and check that `eslint.config.js` is in `frontend/` (not a subdirectory) and that all packages installed correctly.

If ESLint exits with parse errors instead of lint errors: `@typescript-eslint/parser` is not wired up correctly — verify the `languageOptions.parser` line in `eslint.config.js`.

---

### Task 2: Fix all dep arrays, verify GREEN, confirm no regressions

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` line 24
- Modify: `frontend/src/pages/Settings.tsx` line 35
- Modify: `frontend/src/pages/History.tsx` line 15

**Safety note:** All three fixes add only Zustand action references or Zustand state slices to dep arrays. Zustand action references are stable (referentially equal across renders, guaranteed by Zustand). The existing `if (!x)` guards in Dashboard and Settings prevent re-entrancy if the effect re-runs after state loads. No observable behavior changes.

- [ ] **Step 1: Fix Dashboard.tsx**

In `frontend/src/pages/Dashboard.tsx`, find this block (around line 22):

```typescript
useEffect(() => {
  if (!settings) fetchSettings()
}, [])
```

Change the dependency array to:

```typescript
useEffect(() => {
  if (!settings) fetchSettings()
}, [settings, fetchSettings])
```

Do not change anything else in this file. The second `useEffect` (the one that calls `getPriceHistory`) already has a correct empty dep array — `getPriceHistory` is a stable module-level import and `setPriceHistory`/`setPriceHistoryError`/`setChartLoading` are useState setters (both are stable and correctly excluded by the ESLint rule).

- [ ] **Step 2: Fix Settings.tsx**

In `frontend/src/pages/Settings.tsx`, find this block (around line 33):

```typescript
useEffect(() => {
  if (!settings) fetchSettings()
}, [])
```

Change the dependency array to:

```typescript
useEffect(() => {
  if (!settings) fetchSettings()
}, [settings, fetchSettings])
```

The second `useEffect` in Settings.tsx (around line 37) already has `[settings]` as its dep array and is correct — leave it unchanged.

- [ ] **Step 3: Fix History.tsx**

In `frontend/src/pages/History.tsx`, find this block (around line 13):

```typescript
useEffect(() => {
  fetchHistory().finally(() => setHasFetched(true))
}, [])
```

Change the dependency array to:

```typescript
useEffect(() => {
  fetchHistory().finally(() => setHasFetched(true))
}, [fetchHistory])
```

`setHasFetched` is a useState setter — stable, correctly excluded by the rule.

- [ ] **Step 4: Verify ESLint is clean (GREEN)**

Run from `frontend/`:

```
npm run lint
```

Expected: exits 0 with no output or a `0 problems` summary. If any violations remain, read the error output carefully and fix before continuing. Do not proceed with a non-zero exit.

- [ ] **Step 5: Verify no unit test regressions**

Run from `frontend/`:

```
npm run test:run
```

Expected: all 53 tests pass, 0 failures. If any test fails, read the failure output — a dep array change should not affect test behavior since Zustand's mock state in tests does not depend on effect dep arrays. If tests do fail, investigate carefully before proceeding.
