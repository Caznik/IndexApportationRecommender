import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Settings } from '../api'

type RiskProfile = 'conservative' | 'balanced' | 'aggressive'

interface FormValues {
  base_amount: string
  min_amount: string
  max_amount: string
  risk_profile: RiskProfile
  ticker: string
}

const EMPTY_FORM: FormValues = {
  base_amount: '',
  min_amount: '',
  max_amount: '',
  risk_profile: 'balanced',
  ticker: '',
}

function profileToForm(p: Settings): FormValues {
  return {
    base_amount: String(p.base_amount),
    min_amount: String(p.min_amount),
    max_amount: String(p.max_amount),
    risk_profile: p.risk_profile as RiskProfile,
    ticker: p.ticker,
  }
}

function validate(values: FormValues, isNew: boolean): string | null {
  const base = Number(values.base_amount)
  const min = Number(values.min_amount)
  const max = Number(values.max_amount)
  if (!base || base <= 0) return 'Base amount must be greater than 0'
  if (!min || min <= 0) return 'Minimum must be greater than 0'
  if (!max || max <= 0) return 'Maximum must be greater than 0'
  if (min > max) return 'Minimum must not exceed maximum'
  if (isNew && !values.ticker.trim()) return 'Ticker must not be empty'
  return null
}

const FIELDS: { id: keyof FormValues; label: string }[] = [
  { id: 'base_amount', label: 'Base amount (€)' },
  { id: 'min_amount', label: 'Minimum (€)' },
  { id: 'max_amount', label: 'Maximum (€)' },
]

const RISK_OPTIONS: RiskProfile[] = ['conservative', 'balanced', 'aggressive']

export function Settings() {
  const settings = useStore((s) => s.settings)
  const settingsLoading = useStore((s) => s.settingsLoading)
  const settingsError = useStore((s) => s.settingsError)
  const fetchSettings = useStore((s) => s.fetchSettings)
  const createProfile = useStore((s) => s.createProfile)
  const saveProfile = useStore((s) => s.saveProfile)
  const deleteProfile = useStore((s) => s.deleteProfile)

  const [editingTicker, setEditingTicker] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedTicker, setSavedTicker] = useState<string | null>(null)

  useEffect(() => {
    if (settings.length === 0) fetchSettings()
  }, [settings.length, fetchSettings])

  function startEdit(profile: Settings) {
    setEditingTicker(profile.ticker)
    setAdding(false)
    setFormValues(profileToForm(profile))
    setFormError(null)
    setSavedTicker(null)
  }

  function startAdd() {
    setAdding(true)
    setEditingTicker(null)
    setFormValues(EMPTY_FORM)
    setFormError(null)
    setSavedTicker(null)
  }

  function cancelForm() {
    setEditingTicker(null)
    setAdding(false)
    setFormError(null)
  }

  function handleChange(field: keyof FormValues, value: string) {
    setFormValues((v) => ({ ...v, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isNew = adding
    const error = validate(formValues, isNew)
    if (error) { setFormError(error); return }
    setFormError(null)
    const update = {
      base_amount: Number(formValues.base_amount),
      min_amount: Number(formValues.min_amount),
      max_amount: Number(formValues.max_amount),
      risk_profile: formValues.risk_profile,
    }
    try {
      if (editingTicker) {
        await saveProfile(editingTicker, update)
        setSavedTicker(editingTicker)
        setEditingTicker(null)
      } else {
        await createProfile({ ...update, ticker: formValues.ticker })
        setSavedTicker(formValues.ticker)
        setAdding(false)
      }
    } catch {
      // settingsError from store will display the error
    }
  }

  async function handleDelete(ticker: string) {
    await deleteProfile(ticker)
    setConfirmDelete(null)
  }

  const riskBadgeClass: Record<RiskProfile, string> = {
    conservative: 'bg-blue-100 text-blue-700',
    balanced: 'bg-green-100 text-green-700',
    aggressive: 'bg-red-100 text-red-700',
  }

  const isFormOpen = adding || editingTicker !== null

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Ticker Profiles</h1>

      {settingsLoading && (
        <div className="bg-surface-1 rounded-xl p-6 animate-pulse h-24 mb-4" />
      )}

      {settingsError && (
        <p className="text-red-500 text-sm mb-4">{settingsError}</p>
      )}

      <div className="flex flex-col gap-3 mb-4">
        {settings.map((profile) => (
          <div key={profile.ticker} className="bg-surface-1 rounded-xl p-5">
            {editingTicker === profile.ticker ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{profile.ticker}</span>
                  <span className="text-ink-muted text-xs">(ticker cannot be changed)</span>
                </div>
                {FIELDS.map(({ id, label }) => (
                  <div key={id} className="flex flex-col gap-1">
                    <label htmlFor={`edit-${id}`} className="text-sm text-ink-muted">{label}</label>
                    <input
                      id={`edit-${id}`}
                      type="number"
                      value={formValues[id] as string}
                      onChange={(e) => handleChange(id, e.target.value)}
                      className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                      aria-label={label}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-risk" className="text-sm text-ink-muted">Risk profile</label>
                  <select
                    id="edit-risk"
                    value={formValues.risk_profile}
                    onChange={(e) => handleChange('risk_profile', e.target.value)}
                    className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {RISK_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {formError && <p className="text-red-500 text-xs">{formError}</p>}
                <div className="flex gap-2 mt-1">
                  <button type="submit" className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium">
                    Save
                  </button>
                  <button type="button" onClick={cancelForm} className="text-sm text-ink-muted px-2">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{profile.ticker}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${riskBadgeClass[profile.risk_profile as RiskProfile]}`}>
                      {profile.risk_profile}
                    </span>
                    {savedTicker === profile.ticker && (
                      <span className="text-green-600 text-xs">Saved</span>
                    )}
                  </div>
                  <p className="text-ink-muted text-sm">
                    €{Number(profile.base_amount).toFixed(0)} base · €{Number(profile.min_amount).toFixed(0)}–€{Number(profile.max_amount).toFixed(0)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(profile)}
                    className="text-sm text-ink-muted hover:text-ink px-2 py-1"
                    aria-label={`Edit ${profile.ticker}`}
                  >
                    Edit
                  </button>
                  {confirmDelete === profile.ticker ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-ink-muted">Delete {profile.ticker}?</span>
                      <button
                        onClick={() => handleDelete(profile.ticker)}
                        className="text-xs text-red-600 hover:text-red-700 px-1"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-ink-muted px-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(profile.ticker)}
                      className="text-sm text-ink-muted hover:text-red-500 px-2 py-1"
                      aria-label={`Delete ${profile.ticker}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-surface-1 rounded-xl p-5 mb-4">
          <h2 className="font-semibold mb-3">Add Ticker</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="add-ticker" className="text-sm text-ink-muted">Ticker</label>
              <input
                id="add-ticker"
                type="text"
                value={formValues.ticker}
                onChange={(e) => handleChange('ticker', e.target.value)}
                className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                placeholder="e.g. VWRA"
                aria-label="Ticker"
              />
            </div>
            {FIELDS.map(({ id, label }) => (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={`add-${id}`} className="text-sm text-ink-muted">{label}</label>
                <input
                  id={`add-${id}`}
                  type="number"
                  value={formValues[id] as string}
                  onChange={(e) => handleChange(id, e.target.value)}
                  className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
                  aria-label={label}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label htmlFor="add-risk" className="text-sm text-ink-muted">Risk profile</label>
              <select
                id="add-risk"
                value={formValues.risk_profile}
                onChange={(e) => handleChange('risk_profile', e.target.value)}
                className="bg-surface-2 rounded-lg px-3 py-2 text-sm w-full"
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {formError && <p className="text-red-500 text-xs">{formError}</p>}
            <div className="flex gap-2 mt-1">
              <button type="submit" className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium">
                Add
              </button>
              <button type="button" onClick={cancelForm} className="text-sm text-ink-muted px-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        !isFormOpen && (
          <button
            onClick={startAdd}
            className="w-full bg-surface-1 hover:bg-surface-2 rounded-xl px-5 py-4 text-sm text-ink-muted text-left transition-colors"
          >
            + Add ticker
          </button>
        )
      )}
    </div>
  )
}
