# Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React/Vite/TypeScript SPA for IndexApportationRecommender — Dashboard, Settings, and History views wired to the FastAPI backend, styled with the Framer dark-canvas design system from DESIGN.md.

**Architecture:** Vite + React 18 + TypeScript SPA with React Router v6 for tab navigation. A single Zustand store with three prefixed slices (recommendation, settings, history) holds all API state. One `api.ts` module owns all five fetch calls. Recharts `AreaChart` renders the price history.

**Tech Stack:** React 18, Vite 5, TypeScript, React Router v6, Zustand, Recharts, Tailwind CSS v3, Inter Variable (@fontsource-variable/inter), Vitest + @testing-library/react.

---

## File Map

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite + Vitest config, /api proxy to :8000 |
| `frontend/tailwind.config.ts` | DESIGN.md tokens mapped to Tailwind theme |
| `frontend/postcss.config.js` | Tailwind + autoprefixer |
| `frontend/src/index.css` | Tailwind directives, font import, :root defaults |
| `frontend/src/setupTests.ts` | @testing-library/jest-dom import |
| `frontend/src/api.ts` | 5 typed fetch functions + TypeScript interfaces |
| `frontend/src/store.ts` | Zustand store — recommendation + settings + history slices |
| `frontend/src/main.tsx` | ReactDOM root, BrowserRouter, Routes |
| `frontend/src/App.tsx` | Tab nav shell + Outlet |
| `frontend/src/components/StatCard.tsx` | surface-1 stat tile |
| `frontend/src/components/HeroCard.tsx` | gradient spotlight card (empty/loading/error/loaded states) |
| `frontend/src/components/PriceChart.tsx` | Recharts AreaChart wrapper |
| `frontend/src/components/HistoryTable.tsx` | comparison-row table |
| `frontend/src/pages/Dashboard.tsx` | Dashboard page — hero + stats + chart |
| `frontend/src/pages/Settings.tsx` | Settings form page |
| `frontend/src/pages/History.tsx` | History table page |
| `frontend/src/__tests__/api.test.ts` | API module unit tests |
| `frontend/src/__tests__/store.test.ts` | Zustand store unit tests |
| `frontend/src/__tests__/HeroCard.test.tsx` | HeroCard render tests |
| `frontend/src/__tests__/Dashboard.test.tsx` | Dashboard interaction tests |
| `frontend/src/__tests__/Settings.test.tsx` | Settings form tests |
| `frontend/src/__tests__/History.test.tsx` | History table tests |

---

## Task 1: Scaffold Vite project + install dependencies

**Files:**
- Create: `frontend/` directory tree
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/index.css`
- Create: `frontend/src/setupTests.ts`

- [ ] **Step 1: Scaffold Vite project**

From the repo root:
```powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
```

- [ ] **Step 2: Install runtime dependencies**

```powershell
npm install react-router-dom zustand recharts @fontsource-variable/inter
```

- [ ] **Step 3: Install dev dependencies**

```powershell
npm install -D tailwindcss postcss autoprefixer vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Initialize Tailwind**

```powershell
npx tailwindcss init -p --ts
```

- [ ] **Step 5: Write `vite.config.ts`**

Replace the generated `vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**'],
    },
  },
})
```

- [ ] **Step 6: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
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
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '15px',
        xl: '20px',
        xxl: '30px',
        pill: '100px',
      },
      fontFamily: {
        display: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 7: Write `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: Write `src/index.css`**

```css
@import '@fontsource-variable/inter';

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
  font-feature-settings: 'cv11' 1, 'cv05' 1, 'cv09' 1, 'ss03' 1, 'ss07' 1;
  background-color: #090909;
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 9: Write `src/setupTests.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 10: Add test script to `package.json`**

In `frontend/package.json`, ensure the `scripts` section includes:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

- [ ] **Step 11: Verify setup compiles**

```powershell
npm run build
```
Expected: build succeeds with no TypeScript errors.

---

## Task 2: API module

**Files:**
- Create: `frontend/src/api.ts`
- Create: `frontend/src/__tests__/api.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockError(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ detail: 'error' }),
  } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('generateRecommendation', () => {
  it('POSTs to /api/recommendation/generate', async () => {
    mockFetch.mockReturnValue(mockOk({ current_price: 97.4, recommended_amount: 620 }))
    const result = await api.generateRecommendation()
    expect(mockFetch).toHaveBeenCalledWith('/api/recommendation/generate', {
      method: 'POST',
    })
    expect(result.recommended_amount).toBe(620)
  })

  it('throws on non-2xx', async () => {
    mockFetch.mockReturnValue(mockError(503))
    await expect(api.generateRecommendation()).rejects.toThrow('HTTP 503')
  })
})

describe('getSettings', () => {
  it('GETs /api/settings', async () => {
    mockFetch.mockReturnValue(mockOk({ base_amount: 500 }))
    await api.getSettings()
    expect(mockFetch).toHaveBeenCalledWith('/api/settings')
  })
})

describe('saveSettings', () => {
  it('PUTs /api/settings with JSON body', async () => {
    const update = { base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
    mockFetch.mockReturnValue(mockOk({ ...update, id: 1 }))
    await api.saveSettings(update)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
  })
})

describe('getHistory', () => {
  it('GETs /api/history', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getHistory()
    expect(mockFetch).toHaveBeenCalledWith('/api/history')
  })
})

describe('getPriceHistory', () => {
  it('GETs /api/market/history', async () => {
    mockFetch.mockReturnValue(mockOk([]))
    await api.getPriceHistory()
    expect(mockFetch).toHaveBeenCalledWith('/api/market/history')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/api.test.ts
```
Expected: FAIL — `api` module not found.

- [ ] **Step 3: Write `src/api.ts`**

```ts
export interface RecommendationResult {
  current_price: number
  drawdown: number
  drawdown_pct: number
  multiplier: number
  recommended_amount: number
  rule_triggered: string
  explanation: string
}

export interface Settings {
  id: number
  base_amount: number
  min_amount: number
  max_amount: number
  ticker: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
}

export interface SettingsUpdate {
  base_amount: number
  min_amount: number
  max_amount: number
  ticker: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
}

export interface RecommendationRecord {
  id: number
  created_at: string
  ticker: string
  market_price: number
  drawdown: number
  drawdown_pct: number
  multiplier: number
  rule_triggered: string
  recommended_amount: number
  executed_amount: number | null
  explanation: string
}

export interface PricePoint {
  date: string
  close_price: number
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function generateRecommendation(): Promise<RecommendationResult> {
  return request('/api/recommendation/generate', { method: 'POST' })
}

export function getSettings(): Promise<Settings> {
  return request('/api/settings')
}

export function saveSettings(update: SettingsUpdate): Promise<Settings> {
  return request('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
}

export function getHistory(): Promise<RecommendationRecord[]> {
  return request('/api/history')
}

export function getPriceHistory(): Promise<PricePoint[]> {
  return request('/api/market/history')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/__tests__/api.test.ts
```
Expected: 7 tests pass.

---

## Task 3: Zustand store

**Files:**
- Create: `frontend/src/store.ts`
- Create: `frontend/src/__tests__/store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/store.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store'
import * as api from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const INITIAL: Parameters<typeof useStore.setState>[0] = {
  recommendation: null,
  recommendationLoading: false,
  recommendationError: null,
  settings: null,
  settingsLoading: false,
  settingsError: null,
  history: [],
  historyLoading: false,
  historyError: null,
}

beforeEach(() => {
  useStore.setState(INITIAL)
  vi.clearAllMocks()
})

describe('generate', () => {
  it('sets recommendation on success', async () => {
    const result = { current_price: 97, recommended_amount: 620, drawdown: -0.08, drawdown_pct: -0.08, multiplier: 1.2, rule_triggered: '-5% band', explanation: '' }
    mockApi.generateRecommendation.mockResolvedValue(result)
    await useStore.getState().generate()
    expect(useStore.getState().recommendation).toEqual(result)
    expect(useStore.getState().recommendationLoading).toBe(false)
  })

  it('sets recommendationError on failure', async () => {
    mockApi.generateRecommendation.mockRejectedValue(new Error('HTTP 503'))
    await useStore.getState().generate()
    expect(useStore.getState().recommendationError).toBe('HTTP 503')
    expect(useStore.getState().recommendation).toBeNull()
  })
})

describe('fetchSettings', () => {
  it('sets settings on success', async () => {
    const s = { id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced' as const }
    mockApi.getSettings.mockResolvedValue(s)
    await useStore.getState().fetchSettings()
    expect(useStore.getState().settings).toEqual(s)
  })
})

describe('saveSettings', () => {
  it('updates settings slice on success', async () => {
    const update = { base_amount: 600, min_amount: 100, max_amount: 1200, ticker: 'URTH', risk_profile: 'aggressive' as const }
    const saved = { id: 1, ...update }
    mockApi.saveSettings.mockResolvedValue(saved)
    await useStore.getState().saveSettings(update)
    expect(useStore.getState().settings).toEqual(saved)
  })
})

describe('fetchHistory', () => {
  it('sets history rows on success', async () => {
    const rows = [{ id: 1, created_at: '2024-01-01T00:00:00Z', ticker: 'URTH', market_price: 97, drawdown: -0.08, drawdown_pct: -0.08, multiplier: 1.2, rule_triggered: '-5% band', recommended_amount: 620, executed_amount: null, explanation: '' }]
    mockApi.getHistory.mockResolvedValue(rows)
    await useStore.getState().fetchHistory()
    expect(useStore.getState().history).toEqual(rows)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/store.test.ts
```
Expected: FAIL — `store` module not found.

- [ ] **Step 3: Write `src/store.ts`**

```ts
import { create } from 'zustand'
import type { RecommendationResult, Settings, SettingsUpdate, RecommendationRecord } from './api'
import * as api from './api'

interface State {
  recommendation: RecommendationResult | null
  recommendationLoading: boolean
  recommendationError: string | null
  generate: () => Promise<void>

  settings: Settings | null
  settingsLoading: boolean
  settingsError: string | null
  fetchSettings: () => Promise<void>
  saveSettings: (update: SettingsUpdate) => Promise<void>

  history: RecommendationRecord[]
  historyLoading: boolean
  historyError: string | null
  fetchHistory: () => Promise<void>
}

export const useStore = create<State>((set) => ({
  recommendation: null,
  recommendationLoading: false,
  recommendationError: null,
  generate: async () => {
    set({ recommendationLoading: true, recommendationError: null })
    try {
      const recommendation = await api.generateRecommendation()
      set({ recommendation, recommendationLoading: false })
    } catch (e) {
      set({ recommendationLoading: false, recommendationError: (e as Error).message })
    }
  },

  settings: null,
  settingsLoading: false,
  settingsError: null,
  fetchSettings: async () => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await api.getSettings()
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
    }
  },
  saveSettings: async (update: SettingsUpdate) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await api.saveSettings(update)
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
    }
  },

  history: [],
  historyLoading: false,
  historyError: null,
  fetchHistory: async () => {
    set({ historyLoading: true, historyError: null })
    try {
      const history = await api.getHistory()
      set({ history, historyLoading: false })
    } catch (e) {
      set({ historyLoading: false, historyError: (e as Error).message })
    }
  },
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/__tests__/store.test.ts
```
Expected: 4 tests pass.

---

## Task 4: App shell (main.tsx + App.tsx)

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

No unit tests for this task — it is a layout shell with no logic.

- [ ] **Step 1: Write `src/main.tsx`**

Replace the generated `main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { History } from './pages/History'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Write `src/App.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom'

const TAB_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/settings', label: 'Settings', end: false },
  { to: '/history', label: 'History', end: false },
]

export function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-body">
      <nav className="h-14 bg-canvas border-b border-hairline flex items-center px-6">
        <span className="text-sm font-semibold tracking-tight text-ink">
          IndexApportationRecommender
        </span>
        <div className="flex gap-1 ml-auto">
          {TAB_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-pill text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-2 text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create placeholder page files so the app compiles**

Create `frontend/src/pages/Dashboard.tsx`:
```tsx
export function Dashboard() {
  return <div>Dashboard</div>
}
```

Create `frontend/src/pages/Settings.tsx`:
```tsx
export function Settings() {
  return <div>Settings</div>
}
```

Create `frontend/src/pages/History.tsx`:
```tsx
export function History() {
  return <div>History</div>
}
```

- [ ] **Step 4: Verify the app runs**

```powershell
npm run dev
```
Expected: Vite dev server starts on http://localhost:5173. Opening the URL shows "IndexApportationRecommender" nav bar with three tab pills and the word "Dashboard" in the main area.

---

## Task 5: StatCard + HeroCard components

**Files:**
- Create: `frontend/src/components/StatCard.tsx`
- Create: `frontend/src/components/HeroCard.tsx`
- Create: `frontend/src/__tests__/HeroCard.test.tsx`

- [ ] **Step 1: Write failing tests for HeroCard**

Create `frontend/src/__tests__/HeroCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroCard } from '../components/HeroCard'
import type { RecommendationResult } from '../api'

const mockResult: RecommendationResult = {
  current_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  recommended_amount: 620,
  rule_triggered: '-5% band',
  explanation: 'Test explanation',
}

describe('HeroCard', () => {
  it('shows empty state when result is null', () => {
    render(<HeroCard result={null} baseAmount={null} loading={false} error={null} onGenerate={vi.fn()} />)
    expect(screen.getByText('No recommendation yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate recommendation/i })).toBeInTheDocument()
  })

  it('calls onGenerate when Generate button is clicked', async () => {
    const onGenerate = vi.fn()
    render(<HeroCard result={null} baseAmount={null} loading={false} error={null} onGenerate={onGenerate} />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('shows recommended amount in loaded state', () => {
    render(<HeroCard result={mockResult} baseAmount={500} loading={false} error={null} onGenerate={vi.fn()} />)
    expect(screen.getByText('€620')).toBeInTheDocument()
  })

  it('shows loading state with disabled button', () => {
    render(<HeroCard result={null} baseAmount={null} loading={true} error={null} onGenerate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })

  it('shows error state with Retry button', () => {
    render(<HeroCard result={null} baseAmount={null} loading={false} error="HTTP 503" onGenerate={vi.fn()} />)
    expect(screen.getByText('HTTP 503')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/HeroCard.test.tsx
```
Expected: FAIL — `HeroCard` module not found.

- [ ] **Step 3: Write `src/components/StatCard.tsx`**

```tsx
interface Props {
  label: string
  value: string | null
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-surface-1 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-ink-muted text-xs font-medium uppercase tracking-wider">
        {label}
      </span>
      <span className="text-ink text-lg font-semibold tracking-tight">
        {value ?? '—'}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/HeroCard.tsx`**

```tsx
import type { RecommendationResult } from '../api'

interface Props {
  result: RecommendationResult | null
  baseAmount: number | null
  loading: boolean
  error: string | null
  onGenerate: () => void
}

export function HeroCard({ result, baseAmount, loading, error, onGenerate }: Props) {
  if (loading) {
    return (
      <div className="rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta opacity-50 min-h-[160px] flex flex-col items-center justify-center">
        <button
          disabled
          className="bg-white text-black rounded-pill px-5 py-2.5 text-sm font-medium opacity-50 cursor-not-allowed"
        >
          Generating…
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xxl p-8 bg-surface-2 min-h-[160px] flex flex-col items-start gap-3">
        <p className="text-ink-muted text-sm">{error}</p>
        <button
          onClick={onGenerate}
          className="bg-surface-1 text-ink rounded-pill px-4 py-2 text-sm font-medium hover:bg-hairline transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta min-h-[160px] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-white/80 text-base">No recommendation yet</p>
        <button
          onClick={onGenerate}
          className="bg-white text-black rounded-pill px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Generate Recommendation
        </button>
      </div>
    )
  }

  const diff = baseAmount !== null ? Number(result.recommended_amount) - baseAmount : null
  const diffStr =
    diff !== null
      ? `${diff >= 0 ? '+' : ''}€${Math.abs(diff).toFixed(0)}`
      : null
  const drawdownStr = `${(Number(result.drawdown_pct) * 100).toFixed(1)}%`

  return (
    <div className="rounded-xxl p-8 bg-gradient-to-br from-grad-violet to-grad-magenta">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">
            Recommended contribution
          </p>
          <p className="text-white text-5xl font-semibold tracking-tight">
            €{Number(result.recommended_amount).toFixed(0)}
          </p>
          <p className="text-white/70 text-sm mt-2">
            {diffStr && `${diffStr} vs base · `}
            {Number(result.multiplier).toFixed(1)}× · {drawdownStr} drawdown ·{' '}
            <span className="text-white/90">{result.rule_triggered}</span>
          </p>
        </div>
        <button
          onClick={onGenerate}
          className="shrink-0 bg-white/10 text-white rounded-xxl px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```powershell
npm run test:run -- src/__tests__/HeroCard.test.tsx
```
Expected: 5 tests pass.

---

## Task 6: PriceChart component

**Files:**
- Create: `frontend/src/components/PriceChart.tsx`

Recharts operates on SVG and cannot be meaningfully asserted in jsdom. A smoke test confirming it renders without crashing is sufficient.

- [ ] **Step 1: Write smoke test**

Create `frontend/src/__tests__/PriceChart.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PriceChart } from '../components/PriceChart'
import type { PricePoint } from '../api'

const DATA: PricePoint[] = [
  { date: '2024-01-01', close_price: 95 },
  { date: '2024-01-02', close_price: 97 },
  { date: '2024-01-03', close_price: 96 },
]

describe('PriceChart', () => {
  it('renders without crashing with data', () => {
    const { container } = render(<PriceChart data={DATA} loading={false} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders loading placeholder when loading', () => {
    const { container } = render(<PriceChart data={[]} loading={true} />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/PriceChart.test.tsx
```
Expected: FAIL — `PriceChart` module not found.

- [ ] **Step 3: Write `src/components/PriceChart.tsx`**

```tsx
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PricePoint } from '../api'

interface Props {
  data: PricePoint[]
  loading: boolean
}

export function PriceChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full h-48 bg-surface-1 rounded-xl animate-pulse" />
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-48 bg-surface-1 rounded-xl flex items-center justify-center">
        <span className="text-ink-muted text-sm">No price data</span>
      </div>
    )
  }

  // Show every ~30th label to avoid crowding on 365 data points
  const tickInterval = Math.floor(data.length / 12)

  return (
    <div className="w-full h-48 bg-surface-1 rounded-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6a4cf5" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6a4cf5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#999999', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }}
          />
          <YAxis
            tick={{ fill: '#999999', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1c1c',
              border: '1px solid #262626',
              borderRadius: '10px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Price']}
            labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          />
          <Area
            type="monotone"
            dataKey="close_price"
            stroke="#6a4cf5"
            strokeWidth={1.5}
            fill="url(#priceGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#6a4cf5' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/__tests__/PriceChart.test.tsx
```
Expected: 2 tests pass.

---

## Task 7: Dashboard page

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (replace placeholder)
- Create: `frontend/src/__tests__/Dashboard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/Dashboard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../pages/Dashboard'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationResult, Settings } from '../api'

// Mock API module — components call api functions directly and via store
vi.mock('../api')
const mockApi = vi.mocked(api)

// Mock PriceChart to avoid Recharts/SVG complexity in unit tests
vi.mock('../components/PriceChart', () => ({
  PriceChart: () => <div data-testid="price-chart" />,
}))

const mockSettings: Settings = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

const mockResult: RecommendationResult = {
  current_price: 97.4, drawdown: -0.082, drawdown_pct: -0.082, multiplier: 1.2,
  recommended_amount: 620, rule_triggered: '-5% band', explanation: '',
}

beforeEach(() => {
  // Reset real store state before each test
  useStore.setState({
    recommendation: null,
    recommendationLoading: false,
    recommendationError: null,
    settings: mockSettings,
    settingsLoading: false,
    settingsError: null,
    history: [],
    historyLoading: false,
    historyError: null,
  })
  vi.clearAllMocks()
  mockApi.getPriceHistory.mockResolvedValue([])
  mockApi.getSettings.mockResolvedValue(mockSettings)
})

describe('Dashboard', () => {
  it('renders empty state when no recommendation', () => {
    render(<Dashboard />)
    expect(screen.getByText('No recommendation yet')).toBeInTheDocument()
  })

  it('calls POST /api/recommendation/generate when Generate clicked', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() => expect(mockApi.generateRecommendation).toHaveBeenCalledOnce())
  })

  it('renders recommended amount after successful generate', async () => {
    mockApi.generateRecommendation.mockResolvedValue(mockResult)
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() => expect(screen.getByText('€620')).toBeInTheDocument())
  })

  it('shows loading state while generating', async () => {
    // Never resolves during this test — keeps loading state visible
    mockApi.generateRecommendation.mockReturnValue(new Promise(() => {}))
    render(<Dashboard />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/Dashboard.test.tsx
```
Expected: FAIL — Dashboard uses placeholder implementation.

- [ ] **Step 3: Write `src/pages/Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getPriceHistory } from '../api'
import type { PricePoint } from '../api'
import { HeroCard } from '../components/HeroCard'
import { StatCard } from '../components/StatCard'
import { PriceChart } from '../components/PriceChart'

export function Dashboard() {
  const recommendation = useStore((s) => s.recommendation)
  const recommendationLoading = useStore((s) => s.recommendationLoading)
  const recommendationError = useStore((s) => s.recommendationError)
  const generate = useStore((s) => s.generate)
  const settings = useStore((s) => s.settings)
  const fetchSettings = useStore((s) => s.fetchSettings)

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    if (!settings) fetchSettings()
  }, [])

  useEffect(() => {
    setChartLoading(true)
    getPriceHistory()
      .then(setPriceHistory)
      .catch(() => {})
      .finally(() => setChartLoading(false))
  }, [])

  const statCards = [
    {
      label: 'Current Price',
      value: recommendation ? `$${Number(recommendation.current_price).toFixed(2)}` : null,
    },
    {
      label: '12m High',
      value:
        recommendation && settings
          ? `$${(Number(recommendation.current_price) / (1 + Number(recommendation.drawdown))).toFixed(2)}`
          : null,
    },
    {
      label: 'Base Amount',
      value: settings ? `€${Number(settings.base_amount).toFixed(0)}` : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <HeroCard
        result={recommendation}
        baseAmount={settings ? Number(settings.base_amount) : null}
        loading={recommendationLoading}
        error={recommendationError}
        onGenerate={generate}
      />

      <div className="grid grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <PriceChart data={priceHistory} loading={chartLoading} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/__tests__/Dashboard.test.tsx
```
Expected: 4 tests pass.

---

## Task 8: Settings page

**Files:**
- Modify: `frontend/src/pages/Settings.tsx` (replace placeholder)
- Create: `frontend/src/__tests__/Settings.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/Settings.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../pages/Settings'
import { useStore } from '../store'
import * as api from '../api'
import type { Settings as SettingsType } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const mockSettings: SettingsType = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

beforeEach(() => {
  useStore.setState({
    settings: mockSettings,
    settingsLoading: false,
    settingsError: null,
    recommendation: null, recommendationLoading: false, recommendationError: null,
    history: [], historyLoading: false, historyError: null,
  })
  vi.clearAllMocks()
  mockApi.saveSettings.mockResolvedValue(mockSettings)
  mockApi.getSettings.mockResolvedValue(mockSettings)
})

describe('Settings', () => {
  it('renders form with values from store', () => {
    render(<Settings />)
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('URTH')).toBeInTheDocument()
  })

  it('calls PUT /api/settings with form values on submit', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockApi.saveSettings).toHaveBeenCalledWith({
        base_amount: 500, min_amount: 100, max_amount: 1000,
        ticker: 'URTH', risk_profile: 'balanced',
      })
    })
  })

  it('shows validation error when min > max', async () => {
    render(<Settings />)
    const minInput = screen.getByLabelText(/minimum/i)
    await userEvent.clear(minInput)
    await userEvent.type(minInput, '2000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/minimum must not exceed maximum/i)).toBeInTheDocument()
    expect(mockApi.saveSettings).not.toHaveBeenCalled()
  })

  it('shows success message after save', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/Settings.test.tsx
```
Expected: FAIL — Settings uses placeholder implementation.

- [ ] **Step 3: Write `src/pages/Settings.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { SettingsUpdate } from '../api'

type RiskProfile = 'conservative' | 'balanced' | 'aggressive'
const RISK_PROFILES: RiskProfile[] = ['conservative', 'balanced', 'aggressive']

interface FormState {
  base_amount: string
  min_amount: string
  max_amount: string
  ticker: string
  risk_profile: RiskProfile
}

export function Settings() {
  const settings = useStore((s) => s.settings)
  const settingsLoading = useStore((s) => s.settingsLoading)
  const settingsError = useStore((s) => s.settingsError)
  const fetchSettings = useStore((s) => s.fetchSettings)
  const saveSettings = useStore((s) => s.saveSettings)

  const [form, setForm] = useState<FormState>({
    base_amount: '',
    min_amount: '',
    max_amount: '',
    ticker: '',
    risk_profile: 'balanced',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!settings) fetchSettings()
  }, [])

  useEffect(() => {
    if (settings) {
      setForm({
        base_amount: String(Number(settings.base_amount).toFixed(0)),
        min_amount: String(Number(settings.min_amount).toFixed(0)),
        max_amount: String(Number(settings.max_amount).toFixed(0)),
        ticker: settings.ticker,
        risk_profile: settings.risk_profile as RiskProfile,
      })
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaveSuccess(false)

    const base = Number(form.base_amount)
    const min = Number(form.min_amount)
    const max = Number(form.max_amount)

    if (!base || base <= 0 || !min || min <= 0 || !max || max <= 0) {
      setFormError('All amounts must be greater than 0')
      return
    }
    if (min > max) {
      setFormError('Minimum must not exceed maximum')
      return
    }
    if (!form.ticker.trim()) {
      setFormError('Ticker is required')
      return
    }

    const update: SettingsUpdate = {
      base_amount: base,
      min_amount: min,
      max_amount: max,
      ticker: form.ticker.trim(),
      risk_profile: form.risk_profile,
    }

    await saveSettings(update)
    setSaveSuccess(true)
  }

  const field = (id: keyof FormState, label: string, ariaLabel?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink-muted text-xs font-medium uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-surface-1 rounded-md px-3 py-2.5 focus-within:ring-1 focus-within:ring-accent-blue">
        {(id !== 'ticker' && id !== 'risk_profile') && (
          <span className="text-ink-muted text-sm">€</span>
        )}
        <input
          id={id}
          aria-label={ariaLabel ?? label}
          type={id === 'ticker' ? 'text' : 'number'}
          value={form[id] as string}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          className="bg-transparent text-ink text-sm outline-none w-full"
          min={id !== 'ticker' ? '0' : undefined}
          step={id !== 'ticker' ? '1' : undefined}
        />
      </div>
    </div>
  )

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>

      {settingsLoading && !settings && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-64" />
      )}

      {settings && (
        <form onSubmit={handleSubmit} className="bg-surface-1 rounded-xl p-6 flex flex-col gap-5">
          {field('base_amount', 'Base monthly contribution')}
          {field('min_amount', 'Minimum contribution', 'Minimum')}
          {field('max_amount', 'Maximum contribution', 'Maximum')}
          {field('ticker', 'Market ticker')}

          <div className="flex flex-col gap-1.5">
            <span className="text-ink-muted text-xs font-medium uppercase tracking-wider">
              Risk profile
            </span>
            <div className="flex gap-2">
              {RISK_PROFILES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, risk_profile: p }))}
                  className={`flex-1 py-1.5 rounded-pill text-sm font-medium transition-colors capitalize ${
                    form.risk_profile === p
                      ? 'bg-surface-2 text-ink'
                      : 'bg-canvas text-ink-muted hover:text-ink'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-400">{formError}</p>
          )}
          {settingsError && (
            <p className="text-sm text-red-400">{settingsError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-success">Saved ✓</p>
          )}

          <button
            type="submit"
            disabled={settingsLoading}
            className="w-full bg-white text-black rounded-pill py-2.5 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {settingsLoading ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/__tests__/Settings.test.tsx
```
Expected: 4 tests pass.

---

## Task 9: History page + HistoryTable

**Files:**
- Create: `frontend/src/components/HistoryTable.tsx`
- Modify: `frontend/src/pages/History.tsx` (replace placeholder)
- Create: `frontend/src/__tests__/History.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/History.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { History } from '../pages/History'
import { useStore } from '../store'
import * as api from '../api'
import type { RecommendationRecord } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const mockRow: RecommendationRecord = {
  id: 1, created_at: '2024-03-15T10:00:00Z', ticker: 'URTH',
  market_price: 97.4, drawdown: -0.082, drawdown_pct: -0.082,
  multiplier: 1.2, rule_triggered: '-5% band',
  recommended_amount: 620, executed_amount: null, explanation: '',
}

beforeEach(() => {
  useStore.setState({
    history: [], historyLoading: false, historyError: null,
    recommendation: null, recommendationLoading: false, recommendationError: null,
    settings: null, settingsLoading: false, settingsError: null,
  })
  vi.clearAllMocks()
})

describe('History', () => {
  it('shows empty state after fetching zero rows', async () => {
    mockApi.getHistory.mockResolvedValue([])
    render(<History />)
    await waitFor(() =>
      expect(screen.getByText(/no recommendations yet/i)).toBeInTheDocument()
    )
  })

  it('renders a row for each recommendation', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() => expect(screen.getByText('€620')).toBeInTheDocument())
    expect(screen.getByText('1.2×')).toBeInTheDocument()
  })

  it('shows — for null executed_amount', async () => {
    mockApi.getHistory.mockResolvedValue([mockRow])
    render(<History />)
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/__tests__/History.test.tsx
```
Expected: FAIL — History uses placeholder implementation.

- [ ] **Step 3: Write `src/components/HistoryTable.tsx`**

```tsx
import type { RecommendationRecord } from '../api'

interface Props {
  rows: RecommendationRecord[]
}

const HEADERS = ['Date', 'Price', 'Drawdown', 'Multiplier', 'Recommended', 'Executed']

export function HistoryTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h}
                className="text-left text-ink text-xs font-medium uppercase tracking-wider pb-3 pr-4"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const date = new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            const drawdownPct = `${(Number(row.drawdown_pct) * 100).toFixed(1)}%`
            const isDeepDrawdown = Number(row.drawdown_pct) < -0.1
            return (
              <tr key={row.id} className="border-t border-hairline-soft">
                <td className="text-ink-muted py-3 pr-4">{date}</td>
                <td className="text-ink-muted py-3 pr-4">${Number(row.market_price).toFixed(2)}</td>
                <td className={`py-3 pr-4 ${isDeepDrawdown ? 'text-red-400' : 'text-ink-muted'}`}>
                  {drawdownPct}
                </td>
                <td className="text-ink-muted py-3 pr-4">{Number(row.multiplier).toFixed(1)}×</td>
                <td className="text-ink py-3 pr-4 font-medium">€{Number(row.recommended_amount).toFixed(0)}</td>
                <td className="text-ink-muted py-3 pr-4">
                  {row.executed_amount != null
                    ? `€${Number(row.executed_amount).toFixed(0)}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/pages/History.tsx`**

```tsx
import { useEffect } from 'react'
import { useStore } from '../store'
import { HistoryTable } from '../components/HistoryTable'

export function History() {
  const history = useStore((s) => s.history)
  const historyLoading = useStore((s) => s.historyLoading)
  const historyError = useStore((s) => s.historyError)
  const fetchHistory = useStore((s) => s.fetchHistory)

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">History</h1>

      {historyLoading && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-32" />
      )}

      {historyError && (
        <p className="text-ink-muted text-sm">{historyError}</p>
      )}

      {!historyLoading && !historyError && history.length === 0 && (
        <div className="bg-surface-1 rounded-xl p-8 text-center">
          <p className="text-ink-muted text-sm">
            No recommendations yet. Generate one from the Dashboard.
          </p>
        </div>
      )}

      {!historyLoading && history.length > 0 && (
        <div className="bg-surface-1 rounded-xl p-6">
          <HistoryTable rows={history} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run all tests**

```powershell
npm run test:run
```
Expected: All tests pass (api: 7, store: 4, HeroCard: 5, PriceChart: 2, Dashboard: 4, Settings: 4, History: 3 = 29 tests).

- [ ] **Step 6: Verify full app in browser**

Ensure FastAPI backend is running on port 8000, then:
```powershell
npm run dev
```

Smoke test checklist:
- [ ] Dashboard loads, chart appears with market data
- [ ] "Generate Recommendation" button → hero card updates with amount + stats
- [ ] Settings tab → form shows current values, Save works
- [ ] History tab → table shows past recommendations
- [ ] All three tabs navigate without errors
