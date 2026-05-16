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
  }, [settings, fetchSettings])

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
    if (!useStore.getState().settingsError) {
      setSaveSuccess(true)
    }
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
          onChange={(e) => { setSaveSuccess(false); setForm((f) => ({ ...f, [id]: e.target.value })) }}
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
