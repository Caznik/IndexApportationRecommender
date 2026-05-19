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
  if (res.status === 204) return undefined as T
  return res.json()
}

export function generateRecommendation(ticker: string): Promise<RecommendationResult> {
  return request(`/api/recommendation/generate?ticker=${encodeURIComponent(ticker)}`, { method: 'POST' })
}

export function getSettings(): Promise<Settings[]> {
  return request('/api/settings')
}

export function createSettings(body: SettingsUpdate): Promise<Settings> {
  return request('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function saveSettings(ticker: string, update: Omit<SettingsUpdate, 'ticker'>): Promise<Settings> {
  return request(`/api/settings/${encodeURIComponent(ticker)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
}

export function deleteSettings(ticker: string): Promise<void> {
  return request(`/api/settings/${encodeURIComponent(ticker)}`, { method: 'DELETE' })
}

export function getHistory(ticker?: string): Promise<RecommendationRecord[]> {
  const qs = ticker ? `?ticker=${encodeURIComponent(ticker)}` : ''
  return request(`/api/history${qs}`)
}

export function getPriceHistory(ticker: string): Promise<PricePoint[]> {
  return request(`/api/market/history?ticker=${encodeURIComponent(ticker)}`)
}

export function markExecuted(id: number, amount: number): Promise<RecommendationRecord> {
  return request(`/api/history/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executed_amount: amount }),
  })
}

export type OutcomeSnapshot =
  | { status: 'available'; price: number; pct: number }
  | { status: 'pending'; days_remaining: number }

export interface OutcomeResponse {
  one_m: OutcomeSnapshot
  three_m: OutcomeSnapshot
  six_m: OutcomeSnapshot
}

export function getOutcomes(id: number): Promise<OutcomeResponse> {
  return request(`/api/history/${id}/outcomes`)
}
