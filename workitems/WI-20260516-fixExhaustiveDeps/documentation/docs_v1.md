# Documentation — WI-20260516-fixExhaustiveDeps

## Implementation Summary

Added the `react-hooks/exhaustive-deps` ESLint rule to the frontend and fixed all missing hook dependencies in the three page components.

## Impacted Modules

| Module | Change |
|--------|--------|
| `frontend/eslint.config.js` | New file — ESLint flat config (hooks plugin + TS parser) |
| `frontend/package.json` | +4 devDependencies, +1 lint script |
| `frontend/src/pages/Dashboard.tsx` | First useEffect dep array fixed |
| `frontend/src/pages/Settings.tsx` | First useEffect dep array fixed |
| `frontend/src/pages/History.tsx` | useEffect dep array fixed |

## Tests Added / Updated

No new unit tests. The ESLint rule (`npm run lint`) is the automated guard for this class of bug — it will fail any future PR that introduces a missing dep. Existing 53/53 tests continue to pass.

## Documentation Changes

- Added pattern summary: `documentation/patterns/fix-WI-20260516-fixExhaustiveDeps.md`
  - ESLint flat config recipe for Vite + React + TS
  - Zustand action stability rule for useEffect dep arrays
  - useState setter / module import exclusion rule

## How to Run Lint

```
cd frontend
npm run lint     # must exit 0
```

## Verification (run at documentation time)

- `npm run lint` → exit 0, zero violations ✅
- `npm run test:run` → 53 passed, 0 failed ✅
