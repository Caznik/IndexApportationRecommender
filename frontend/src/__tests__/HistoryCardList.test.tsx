import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoryCardList } from '../components/HistoryCardList'
import type { RecommendationRecord } from '../api'

const baseRow: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-15T10:00:00Z',
  ticker: 'URTH',
  market_price: 512.4,
  drawdown: -0.082,
  drawdown_pct: -0.082,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 600,
  executed_amount: null,
  explanation: '',
}

describe('HistoryCardList', () => {
  it('renders one card per row', () => {
    const rows = [baseRow, { ...baseRow, id: 2 }]
    render(<HistoryCardList rows={rows} />)
    expect(screen.getAllByText('May 15, 2026')).toHaveLength(2)
  })

  it('formats drawdown by multiplying by 100', () => {
    render(<HistoryCardList rows={[baseRow]} />)
    expect(screen.getByText('-8.2%')).toBeInTheDocument()
  })

  it('shows — for null executed_amount', () => {
    render(<HistoryCardList rows={[baseRow]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows formatted executed amount when present', () => {
    render(<HistoryCardList rows={[{ ...baseRow, executed_amount: 550 }]} />)
    expect(screen.getByText('€550')).toBeInTheDocument()
  })

  it('applies text-red-400 for deep drawdown (drawdown_pct < -0.1)', () => {
    render(<HistoryCardList rows={[{ ...baseRow, drawdown_pct: -0.15 }]} />)
    expect(screen.getByText('-15.0%')).toHaveClass('text-red-400')
  })

  it('does not apply text-red-400 for shallow drawdown', () => {
    render(<HistoryCardList rows={[baseRow]} />)
    expect(screen.getByText('-8.2%')).not.toHaveClass('text-red-400')
  })
})
