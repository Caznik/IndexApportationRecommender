import { create } from 'zustand'
import type { RecommendationResult, Settings, SettingsUpdate, RecommendationRecord } from './api'
import * as api from './api'

interface State {
  recommendations: Record<string, RecommendationResult>
  recommendationRestoredAt: Record<string, string | null>
  recommendationLoading: boolean
  recommendationError: string | null
  generate: (ticker: string) => Promise<void>
  restoreRecommendation: (ticker: string) => Promise<void>

  settings: Settings[]
  activeTicker: string | null
  settingsLoading: boolean
  settingsError: string | null
  fetchSettings: () => Promise<void>
  createProfile: (body: SettingsUpdate) => Promise<void>
  saveProfile: (ticker: string, update: Omit<SettingsUpdate, 'ticker'>) => Promise<void>
  deleteProfile: (ticker: string) => Promise<void>
  setActiveTicker: (ticker: string) => void

  history: RecommendationRecord[]
  historyLoading: boolean
  historyError: string | null
  fetchHistory: (ticker?: string) => Promise<void>
  markExecuted: (id: number, amount: number) => Promise<void>
}

export const useStore = create<State>((set, get) => ({
  recommendations: {},
  recommendationRestoredAt: {},
  recommendationLoading: false,
  recommendationError: null,
  generate: async (ticker: string) => {
    set({ recommendationLoading: true, recommendationError: null })
    try {
      const result = await api.generateRecommendation(ticker)
      set((s) => ({
        recommendations: { ...s.recommendations, [ticker]: result },
        recommendationRestoredAt: { ...s.recommendationRestoredAt, [ticker]: null },
        recommendationLoading: false,
      }))
    } catch (e) {
      set({ recommendationLoading: false, recommendationError: (e as Error).message })
    }
  },
  restoreRecommendation: async (ticker: string) => {
    if (get().recommendations[ticker] !== undefined) return
    try {
      const history = await api.getHistory(ticker)
      if (history.length === 0) return
      const latest = history[0]
      set((s) => ({
        recommendations: {
          ...s.recommendations,
          [ticker]: {
            current_price: latest.market_price,
            drawdown: latest.drawdown,
            drawdown_pct: latest.drawdown_pct,
            multiplier: latest.multiplier,
            recommended_amount: latest.recommended_amount,
            rule_triggered: latest.rule_triggered,
            explanation: latest.explanation,
          },
        },
        recommendationRestoredAt: {
          ...s.recommendationRestoredAt,
          [ticker]: latest.created_at,
        },
      }))
    } catch {
      // silent — restoration is best-effort
    }
  },

  settings: [],
  activeTicker: null,
  settingsLoading: false,
  settingsError: null,
  fetchSettings: async () => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const settings = await api.getSettings()
      set((s) => ({
        settings,
        settingsLoading: false,
        activeTicker:
          s.activeTicker === null && settings.length > 0
            ? settings[0].ticker
            : s.activeTicker,
      }))
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
    }
  },
  createProfile: async (body: SettingsUpdate) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      await api.createSettings(body)
      const settings = await api.getSettings()
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
      throw e
    }
  },
  saveProfile: async (ticker: string, update: Omit<SettingsUpdate, 'ticker'>) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      await api.saveSettings(ticker, update)
      const settings = await api.getSettings()
      set({ settings, settingsLoading: false })
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
      throw e
    }
  },
  deleteProfile: async (ticker: string) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      await api.deleteSettings(ticker)
      const settings = await api.getSettings()
      set((s) => ({
        settings,
        settingsLoading: false,
        activeTicker:
          s.activeTicker === ticker
            ? (settings.length > 0 ? settings[0].ticker : null)
            : s.activeTicker,
      }))
    } catch (e) {
      set({ settingsLoading: false, settingsError: (e as Error).message })
      throw e
    }
  },
  setActiveTicker: (ticker: string) => set({ activeTicker: ticker }),

  history: [],
  historyLoading: false,
  historyError: null,
  fetchHistory: async (ticker?: string) => {
    set({ historyLoading: true, historyError: null })
    try {
      const history = await api.getHistory(ticker)
      set({ history, historyLoading: false })
    } catch (e) {
      set({ historyLoading: false, historyError: (e as Error).message })
    }
  },
  markExecuted: async (id: number, amount: number) => {
    const updated = await api.markExecuted(id, amount)
    set((s) => ({
      history: s.history.map((r) => (r.id === id ? updated : r)),
    }))
  },
}))
