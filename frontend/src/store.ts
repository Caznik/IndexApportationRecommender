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
