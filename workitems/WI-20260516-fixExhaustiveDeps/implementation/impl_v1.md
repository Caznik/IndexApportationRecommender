# Implementation Summary — WI-20260516-fixExhaustiveDeps

## Files Changed

| File | Change |
|------|--------|
| `frontend/package.json` | Added devDependencies (`eslint`, `eslint-plugin-react-hooks`, `@typescript-eslint/parser`, `globals`); added `"lint": "eslint ."` script |
| `frontend/eslint.config.js` | Created — minimal flat config with react-hooks plugin, TS parser, `ignores` for `dist/` and `coverage/` |
| `frontend/src/pages/Dashboard.tsx` | First useEffect dep array: `[]` → `[settings, fetchSettings]` |
| `frontend/src/pages/Settings.tsx` | First useEffect dep array: `[]` → `[settings, fetchSettings]` |
| `frontend/src/pages/History.tsx` | useEffect dep array: `[]` → `[fetchHistory]` |

## Tests

- No new unit tests added (the ESLint rule itself is the regression guard for this class of bug)
- 53/53 existing frontend tests pass: `npm run test:run` ✅
- `npm run lint` exits 0 with zero violations ✅

## Acceptance Criteria Pre-Check

- [x] AC-001: `fetchSettings` listed in dep array in `Dashboard.tsx:24`
- [x] AC-002: `react-hooks/exhaustive-deps` enabled at `error` severity in `eslint.config.js`
- [x] AC-003: `npm run lint` exits 0, zero violations
- [x] AC-004: 53/53 tests pass

## Notes

- `Settings.tsx` and `History.tsx` had the same `[]` dep array pattern as Dashboard — all three fixed together since the enabled ESLint rule would fail on all of them
- ESLint is minimal: hooks plugin + TS parser only; no TypeScript lint rules
- Dep array additions are safe: Zustand action refs are stable, `if (!settings)` guards prevent re-entrancy in Dashboard and Settings
