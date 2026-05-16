import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeroCard } from '../components/HeroCard'
import type { RecommendationResult } from '../api'

const mockResult: RecommendationResult = {
  current_price: 97.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  recommended_amount: 620,
  rule_triggered: '-5% band',
  explanation: 'Test explanation',
}

describe('HeroCard', () => {
  it('shows empty state when result is null', () => {
    render(<HeroCard result={null} baseAmount={null} loading={false} error={null} onGenerate={vi.fn()} />)
    expect(screen.getByText('No recommendation yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate recommendation/i })).toBeInTheDocument()
  })

  it('calls onGenerate when Generate button is clicked', async () => {
    const onGenerate = vi.fn()
    render(<HeroCard result={null} baseAmount={null} loading={false} error={null} onGenerate={onGenerate} />)
    await userEvent.click(screen.getByRole('button', { name: /generate recommendation/i }))
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('shows recommended amount in loaded state', () => {
    render(<HeroCard result={mockResult} baseAmount={500} loading={false} error={null} onGenerate={vi.fn()} />)
    expect(screen.getByText('€620')).toBeInTheDocument()
  })

  it('shows loading state with disabled button', () => {
    render(<HeroCard result={null} baseAmount={null} loading={true} error={null} onGenerate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })

  it('shows error state with Retry button', () => {
    render(<HeroCard result={null} baseAmount={null} loading={false} error="HTTP 503" onGenerate={vi.fn()} />)
    expect(screen.getByText('HTTP 503')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows positive day change badge in green', () => {
    render(
      <HeroCard
        result={mockResult}
        baseAmount={500}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={0.014}
        pctMonth={-0.032}
      />
    )
    expect(screen.getByText('+1.4%')).toBeInTheDocument()
    expect(screen.getByText('-3.2%')).toBeInTheDocument()
  })

  it('shows dash placeholder for null price change values', () => {
    render(
      <HeroCard
        result={mockResult}
        baseAmount={500}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={null}
        pctMonth={null}
      />
    )
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render badges when result is null', () => {
    render(
      <HeroCard
        result={null}
        baseAmount={null}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={0.014}
        pctMonth={0.05}
      />
    )
    expect(screen.queryByText('+1.4%')).not.toBeInTheDocument()
    expect(screen.queryByText('+5.0%')).not.toBeInTheDocument()
  })

  it('shows 0.0% without a sign when price change is exactly zero', () => {
    render(
      <HeroCard
        result={mockResult}
        baseAmount={500}
        loading={false}
        error={null}
        onGenerate={vi.fn()}
        pctDay={0}
        pctMonth={0}
      />
    )
    const zeroBadges = screen.getAllByText('0.0%')
    expect(zeroBadges.length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('+0.0%')).not.toBeInTheDocument()
  })
})
