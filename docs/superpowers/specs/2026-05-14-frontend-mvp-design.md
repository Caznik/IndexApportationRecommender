# Frontend MVP Design — IndexApportationRecommender

**Date:** 2026-05-14  
**Workitem:** WI-20260514-frontendMVP  
**Status:** Approved

---

## Goal

Build a React/Vite/TypeScript SPA that wires the three views (Dashboard, Settings, History) to the existing FastAPI backend, styled with the Framer dark-canvas design system defined in `DESIGN.md`.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Bundler | Vite 5 | `npm create vite@latest frontend -- --template react-ts` |
| UI framework | React 18 + TypeScript | Strict mode |
| Routing | React Router v6 | `/`, `/settings`, `/history` |
| State | Zustand | Single store, 3 slices |
| Styling | Tailwind CSS v3 | Theme extended with DESIGN.md tokens |
| Charts | Recharts | `AreaChart` for price history |
| Fonts | Inter Variable (`@fontsource/inter`) + Geist | Geist replaces GT Walsheim Medium (open-source substitute per DESIGN.md) |

---

## Folder Structure

```
frontend/
├── src/
│   ├── api.ts               # all typed fetch functions (5 endpoints)
│   ├── store.ts             # Zustand store — recommendation + settings + history slices
│   ├── main.tsx             # Vite entry, BrowserRouter
│   ├── App.tsx              # tab nav shell + <Routes>/<Outlet>
│   ├── pages/
│   │   ├── Dashboard.tsx    # hero card + stat cards + chart
│   │   ├── Settings.tsx     # form + save
│   │   └── History.tsx      # table
│   ├── components/
│   │   ├── HeroCard.tsx          # gradient spotlight card
│   │   ├── StatCard.tsx          # surface-1 stat card
│   │   ├── PriceChart.tsx        # Recharts AreaChart wrapper
│   │   └── HistoryTable.tsx      # comparison-row table
│   └── index.css            # Tailwind directives + @fontsource imports
├── tailwind.config.ts       # DESIGN.md tokens mapped to Tailwind theme
├── vite.config.ts           # proxy /api → http://localhost:8000
└── package.json
```

---

## State — Zustand Store

```ts
// store.ts shape

interface RecommendationSlice {
  result: RecommendationResult | null   // null = no recommendation yet
  loading: boolean
  error: string | null
  generate: () => Promise<void>
}

interface SettingsSlice {
  data: Settings | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  save: (update: SettingsUpdate) => Promise<void>
}

interface HistorySlice {
  rows: HistoryRow[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}
```

All three slices compose into a single `useStore` hook via Zustand's `create` with the `combine` pattern.

**Derived value:** "difference vs base" is computed in the Dashboard component as `result.recommended_amount - settings.data.base_amount` — it is not stored, just derived at render time.

---

## API Module

`src/api.ts` exports one typed function per endpoint. All functions throw on non-2xx responses.

```ts
const BASE = '/api'   // proxied to http://localhost:8000 via Vite dev server

generateRecommendation(): Promise<RecommendationResult>   // POST /api/recommendation/generate
getSettings(): Promise<Settings>                          // GET  /api/settings
saveSettings(u: SettingsUpdate): Promise<Settings>        // PUT  /api/settings
getHistory(): Promise<HistoryRow[]>                       // GET  /api/history
getPriceHistory(): Promise<PricePoint[]>                  // GET  /api/market/history
```

---

## Routing & Navigation

```
App.tsx
├── <TabNav> — fixed top bar, 56px, canvas background
│   ├── "IndexApportationRecommender" wordmark (left)
│   └── Tab pills: Dashboard · Settings · History (right-of-center)
└── <Routes>
    ├── /           → <Dashboard>
    ├── /settings   → <Settings>
    └── /history    → <History>
```

Tab pills use `pricing-tab-default` / `pricing-tab-selected` styling: active tab gets `surface-2` background + white text, inactive gets `canvas` background + `ink-muted` text.

---

## Dashboard View

### Empty state (no recommendation yet)

```
┌─────────────────────────────────────────────────────┐
│  [gradient-spotlight-card — violet]                 │
│                                                     │
│    No recommendation yet                            │
│                                                     │
│    [  Generate Recommendation  ]  ← button-primary  │
│                                                     │
└─────────────────────────────────────────────────────┘
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Price  — │  │ 12m hi — │  │ Base   — │   ← stat cards (ink-muted)
└──────────┘  └──────────┘  └──────────┘

[price chart — loads independently from /api/market/history]
```

The chart loads independently of the recommendation — `getPriceHistory()` is called on mount regardless of recommendation state.

### Loaded state

```
┌─────────────────────────────────────────────────────┐
│  [gradient-spotlight-card — violet]    [Regenerate] │
│                                                     │
│    Recommended contribution                         │
│    €620                     ← display-md, tight     │
│    +€120 vs base · 1.2× · −8.2% drawdown · "−5% band" │
│                                                     │
└─────────────────────────────────────────────────────┘
┌──────────┐  ┌──────────┐  ┌──────────┐
│ $97.40   │  │ $106.20  │  │ €500     │
│ Price    │  │ 12m high │  │ Base     │
└──────────┘  └──────────┘  └──────────┘

[AreaChart — full width, violet gradient fill, 3-year daily prices]
```

"Regenerate" button: `button-translucent` styled, sits top-right inside the hero card.

### Loading state
Hero card dims to 50% opacity + CSS pulse animation. Stat cards show skeleton loaders (surface-2 bars animated). Generate button disabled with text "Generating…".

### Error state
Hero card: `surface-2` background (no gradient), error message in `ink-muted`, "Retry" `button-secondary` pill.

---

## Settings View

Single-column form, max-width 480px, centered. Card: `surface-1`, `rounded-xl`, padding 24px.

**Fields:**

| Label | Input type | Validation |
|-------|-----------|-----------|
| Base monthly contribution | number input, `€` prefix | > 0 |
| Minimum contribution | number input, `€` prefix | > 0, ≤ max |
| Maximum contribution | number input, `€` prefix | > 0, ≥ min |
| Market ticker | text input | non-empty |
| Risk profile | pill tab selector | conservative · balanced · aggressive |

**Behavior:**
- On mount: reads from Zustand settings slice (fetches from `GET /api/settings` if not yet loaded)
- "Save" (`button-primary` pill, full-width): calls `saveSettings()`, shows inline success "Saved ✓" (`semantic-success` green) or error message in `ink-muted`
- Client-side validation mirrors backend: amounts > 0, min ≤ max — shows inline validation errors before sending

**Risk profile selector:** three `pricing-tab` pills in a row — Conservative · Balanced · Aggressive. Active = `surface-2` + white; inactive = `canvas` + `ink-muted`.

---

## History View

Full-width table on `surface-1` card, no pagination — all rows, newest first.

**Columns:**

| Column | Source field | Format |
|--------|-------------|--------|
| Date | `created_at` | `MMM DD, YYYY` |
| Price | `current_price` | `$0.00` |
| Drawdown | `drawdown_pct` | `−8.2%` (red tint if < −10%) |
| Multiplier | `multiplier` | `1.2×` |
| Recommended | `recommended_amount` | `€620` |
| Executed | `executed_amount` | `€620` or `—` if null (display-only; no edit endpoint) |

**Style:** `comparison-row` pattern — `body-sm` type, `ink-muted` text, 1px `hairline-soft` dividers. Header row: `ink` white, `body-sm` 500 weight. Table loads on tab mount via `historySlice.fetch()`.

**Empty state:** centered, `ink-muted` — "No recommendations yet. Generate one from the Dashboard."

---

## Tailwind Config — DESIGN.md Token Mapping

```ts
// tailwind.config.ts (key additions)
theme: {
  extend: {
    colors: {
      canvas: '#090909',
      'surface-1': '#141414',
      'surface-2': '#1c1c1c',
      hairline: '#262626',
      'hairline-soft': '#1a1a1a',
      ink: '#ffffff',
      'ink-muted': '#999999',
      'accent-blue': '#0099ff',
      'grad-violet': '#6a4cf5',
      'grad-magenta': '#d44df0',
      'grad-orange': '#ff7a3d',
      'grad-coral': '#ff5577',
      success: '#22c55e',
    },
    borderRadius: {
      xs: '4px', sm: '6px', md: '10px', lg: '15px',
      xl: '20px', xxl: '30px', pill: '100px',
    },
    fontFamily: {
      display: ['Geist', 'system-ui', 'sans-serif'],
      body: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
    },
  },
}
```

---

## Vite Dev Proxy

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:8000',
  },
}
```

This means all `fetch('/api/...')` calls in development are forwarded to the FastAPI server — no CORS issues, no hardcoded ports in app code.

---

## Acceptance Criteria Mapping

| AC | Covered by |
|----|-----------|
| AC-001: Dashboard shows recommendation data | `Dashboard.tsx` loaded state |
| AC-002: Price chart from GET /api/market/history | `PriceChart.tsx` + `getPriceHistory()` |
| AC-003: Settings persist via PUT, reload via GET | `Settings.tsx` + `settingsSlice` |
| AC-004: History table from GET /api/history | `History.tsx` + `historySlice` |
| AC-005: Generate button calls POST and updates dashboard | `recommendationSlice.generate()` |
| AC-006: Loading and error states | Per-slice `loading`/`error` fields |
| AC-007: Responsive + Tailwind | Tailwind responsive utilities throughout |

---

## Font Licensing Note

GT Walsheim Medium is a commercial font. Per DESIGN.md guidance, **Geist** (open-source, Vercel) is used as the display font substitute. Inter Variable is fully open-source and used as-is for all body type.
