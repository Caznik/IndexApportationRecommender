import type { RecommendationResult } from '../api'

interface Props {
  result: RecommendationResult | null
  baseAmount: number | null
  loading: boolean
  error: string | null
  onGenerate: () => void
  pctDay?: number | null
  pctMonth?: number | null
  priceHistoryError?: boolean
}

function PriceBadge({ label, pct }: { label: string; pct: number | null | undefined }) {
  const value = pct ?? null
  const color =
    value === null || value === 0
      ? 'text-white/50'
      : value > 0
      ? 'text-green-400'
      : 'text-red-400'
  const text =
    value === null
      ? '—'
      : value === 0
      ? '0.0%'
      : `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
  return (
    <span className="bg-white/10 rounded-full px-2.5 py-1 text-xs font-medium">
      <span className="text-white/60">{label} </span>
      <span className={color}>{text}</span>
    </span>
  )
}

export function HeroCard({ result, baseAmount, loading, error, onGenerate, pctDay, pctMonth, priceHistoryError }: Props) {
  if (loading) {
    return (
      <div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta opacity-50 min-h-[160px] flex flex-col items-center justify-center">
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
      <div className="rounded-xxl p-5 sm:p-8 bg-surface-2 min-h-[160px] flex flex-col items-start gap-3">
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
      <div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta min-h-[160px] flex flex-col items-center justify-center gap-4 text-center">
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
      ? `${diff >= 0 ? '+' : '-'}€${Math.abs(diff).toFixed(0)}`
      : null
  const drawdownStr = `${(Number(result.drawdown_pct) * 100).toFixed(1)}%`

  return (
    <div className="rounded-xxl p-5 sm:p-8 bg-gradient-to-br from-grad-violet to-grad-magenta">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">
            Recommended contribution
          </p>
          <p className="text-white text-4xl sm:text-5xl font-semibold tracking-tight">
            €{Number(result.recommended_amount).toFixed(0)}
          </p>
          <p className="text-white/70 text-sm mt-2">
            {diffStr && `${diffStr} vs base · `}
            {Number(result.multiplier).toFixed(1)}× · {drawdownStr} drawdown ·{' '}
            <span className="text-white/90">{result.rule_triggered}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <PriceBadge label="1d" pct={pctDay} />
            <PriceBadge label="1m" pct={pctMonth} />
            {priceHistoryError && (
              <span className="text-white/40 text-xs">· market data unavailable</span>
            )}
          </div>
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
