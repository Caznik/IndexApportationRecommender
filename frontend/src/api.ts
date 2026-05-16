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
  const res = init !== undefined ? await fetch(input, init) : await fetch(input)
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

export function markExecuted(id: number, amount: number): Promise<RecommendationRecord> {
  return request(`/api/history/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ executed_amount: amount }),
  })
}
