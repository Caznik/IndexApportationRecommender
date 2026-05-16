import { create } from 'zustand'
import type { RecommendationResult, Settings, SettingsUpdate, RecommendationRecord } from './api'
import * as api from './api'

interface State {
  recommendation: RecommendationResult | null
  recommendationRestoredAt: string | null
  recommendationLoading: boolean
  recommendationError: string | null
  generate: () => Promise<void>
  restoreRecommendation: () => Promise<void>

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

export const useStore = create<State>((set, get) => ({
  recommendation: null,
  recommendationRestoredAt: null,
  recommendationLoading: false,
  recommendationError: null,
  generate: async () => {
    set({ recommendationLoading: true, recommendationError: null })
    try {
      const recommendation = await api.generateRecommendation()
      set({ recommendation, recommendationLoading: false, recommendationRestoredAt: null })
    } catch (e) {
      set({ recommendationLoading: false, recommendationError: (e as Error).message })
    }
  },
  restoreRecommendation: async () => {
    if (get().recommendation !== null) return
    try {
      const history = await api.getHistory()
      if (history.length === 0) return
      const latest = history[0]
      set({
        recommendation: {
          current_price: latest.market_price,
          drawdown: latest.drawdown,
          drawdown_pct: latest.drawdown_pct,
          multiplier: latest.multiplier,
          recommended_amount: latest.recommended_amount,
          rule_triggered: latest.rule_triggered,
          explanation: latest.explanation,
        },
        recommendationRestoredAt: latest.created_at,
      })
    } catch {
      // silent — restoration is best-effort; user can always click Generate
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
