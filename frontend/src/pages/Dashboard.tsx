import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getPriceHistory } from '../api'
import type { PricePoint } from '../api'
import { HeroCard } from '../components/HeroCard'
import { StatCard } from '../components/StatCard'
import { PriceChart } from '../components/PriceChart'
import { computePriceChanges } from '../utils/priceChanges'

export function Dashboard() {
  const recommendation = useStore((s) => s.recommendation)
  const recommendationLoading = useStore((s) => s.recommendationLoading)
  const recommendationError = useStore((s) => s.recommendationError)
  const generate = useStore((s) => s.generate)
  const settings = useStore((s) => s.settings)
  const fetchSettings = useStore((s) => s.fetchSettings)
  const restoreRecommendation = useStore((s) => s.restoreRecommendation)
  const recommendationRestoredAt = useStore((s) => s.recommendationRestoredAt)

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [priceHistoryError, setPriceHistoryError] = useState(false)

  useEffect(() => {
    if (!settings) fetchSettings()
  }, [settings, fetchSettings])

  useEffect(() => {
    if (!recommendation) restoreRecommendation()
  }, [recommendation, restoreRecommendation])

  useEffect(() => {
    setChartLoading(true)
    getPriceHistory()
      .then(setPriceHistory)
      .catch(() => setPriceHistoryError(true))
      .finally(() => setChartLoading(false))
  }, [])

  const { pctDay, pctMonth } = computePriceChanges(priceHistory)

  const statCards = [
    {
      label: 'Current Price',
      value: recommendation ? `$${Number(recommendation.current_price).toFixed(2)}` : null,
    },
    {
      label: '12m High',
      value:
        recommendation && settings
          ? `$${(Number(recommendation.current_price) / (1 + Number(recommendation.drawdown_pct))).toFixed(2)}`
          : null,
    },
    {
      label: 'Base Amount',
      value: settings ? `€${Number(settings.base_amount).toFixed(0)}` : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <HeroCard
        result={recommendation}
        baseAmount={settings ? Number(settings.base_amount) : null}
        loading={recommendationLoading}
        error={recommendationError}
        onGenerate={generate}
        pctDay={pctDay}
        pctMonth={pctMonth}
        priceHistoryError={priceHistoryError}
        restoredAt={recommendationRestoredAt}
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
