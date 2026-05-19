import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getPriceHistory } from '../api'
import type { PricePoint } from '../api'
import { HeroCard } from '../components/HeroCard'
import { StatCard } from '../components/StatCard'
import { PriceChart } from '../components/PriceChart'
import { computePriceChanges } from '../utils/priceChanges'

export function Dashboard() {
  const recommendations = useStore((s) => s.recommendations)
  const recommendationRestoredAt = useStore((s) => s.recommendationRestoredAt)
  const recommendationLoading = useStore((s) => s.recommendationLoading)
  const recommendationError = useStore((s) => s.recommendationError)
  const generate = useStore((s) => s.generate)
  const settings = useStore((s) => s.settings)
  const activeTicker = useStore((s) => s.activeTicker)
  const setActiveTicker = useStore((s) => s.setActiveTicker)
  const fetchSettings = useStore((s) => s.fetchSettings)
  const restoreRecommendation = useStore((s) => s.restoreRecommendation)

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [priceHistoryError, setPriceHistoryError] = useState(false)

  const recommendation = activeTicker ? (recommendations[activeTicker] ?? null) : null
  const activeProfile = settings.find((s) => s.ticker === activeTicker) ?? null
  const restoredAt = activeTicker ? (recommendationRestoredAt[activeTicker] ?? null) : null

  useEffect(() => {
    if (settings.length === 0) fetchSettings()
  }, [settings.length, fetchSettings])

  useEffect(() => {
    if (!activeTicker) return
    if (recommendations[activeTicker] === undefined) {
      restoreRecommendation(activeTicker)
    }
  }, [activeTicker, recommendations, restoreRecommendation])

  useEffect(() => {
    if (!activeTicker) return
    setChartLoading(true)
    setPriceHistoryError(false)
    getPriceHistory(activeTicker)
      .then(setPriceHistory)
      .catch(() => setPriceHistoryError(true))
      .finally(() => setChartLoading(false))
  }, [activeTicker])

  const { pctDay, pctMonth } = computePriceChanges(priceHistory)

  const statCards = [
    {
      label: 'Current Price',
      value: recommendation ? `$${Number(recommendation.current_price).toFixed(2)}` : null,
    },
    {
      label: '12m High',
      value:
        recommendation && activeProfile
          ? `$${(Number(recommendation.current_price) / (1 + Number(recommendation.drawdown))).toFixed(2)}`
          : null,
    },
    {
      label: 'Base Amount',
      value: activeProfile ? `€${Number(activeProfile.base_amount).toFixed(0)}` : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {settings.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {settings.map((s) => (
            <button
              key={s.ticker}
              onClick={() => setActiveTicker(s.ticker)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTicker === s.ticker
                  ? 'bg-surface-3 text-ink'
                  : 'bg-surface-1 text-ink-muted hover:bg-surface-2'
              }`}
            >
              {s.ticker}
            </button>
          ))}
        </div>
      )}

      <HeroCard
        result={recommendation}
        baseAmount={activeProfile ? Number(activeProfile.base_amount) : null}
        loading={recommendationLoading}
        error={recommendationError}
        onGenerate={() => activeTicker && generate(activeTicker)}
        pctDay={pctDay}
        pctMonth={pctMonth}
        priceHistoryError={priceHistoryError}
        restoredAt={restoredAt}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <PriceChart data={priceHistory} loading={chartLoading} />
    </div>
  )
}
