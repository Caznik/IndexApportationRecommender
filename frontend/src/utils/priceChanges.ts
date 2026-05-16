import type { PricePoint } from '../api'

export interface PriceChanges {
  pctDay: number | null
  pctMonth: number | null
}

/** Assumes all `close_price` values are non-zero (equity prices cannot be zero). */
export function computePriceChanges(history: PricePoint[]): PriceChanges {
  if (history.length < 2) return { pctDay: null, pctMonth: null }

  const last = history[history.length - 1]
  const prev = history[history.length - 2]
  const pctDay = (last.close_price - prev.close_price) / prev.close_price

  const lastDate = new Date(last.date)
  const cutoff = new Date(lastDate)
  cutoff.setDate(cutoff.getDate() - 30)

  let monthAgo: PricePoint | null = null
  for (let i = history.length - 2; i >= 0; i--) {
    if (new Date(history[i].date) <= cutoff) {
      monthAgo = history[i]
      break
    }
  }

  return {
    pctDay,
    pctMonth: monthAgo
      ? (last.close_price - monthAgo.close_price) / monthAgo.close_price
      : null,
  }
}
