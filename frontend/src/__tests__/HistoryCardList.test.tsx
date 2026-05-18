import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryCardList } from '../components/HistoryCardList'
import type { RecommendationRecord } from '../api'

vi.mock('../components/OutcomePanel', () => ({
  OutcomePanel: ({ id }: { id: number }) => (
    <div data-testid={`outcome-panel-${id}`} />
  ),
}))

const baseRow: RecommendationRecord = {
  id: 1,
  created_at: '2026-05-15T10:00:00Z',
  ticker: 'URTH',
  market_price: 512.4,
  drawdown: -0.082,
  drawdown_pct: -8.2,
  multiplier: 1.2,
  rule_triggered: '-5% band',
  recommended_amount: 600,
  executed_amount: null,
  explanation: '',
}

describe('HistoryCardList', () => {
  it('renders one card per row', () => {
    const rows = [baseRow, { ...baseRow, id: 2 }]
    render(<HistoryCardList rows={rows} onMarkExecuted={vi.fn()} />)
    expect(screen.getAllByText('May 15, 2026')).toHaveLength(2)
  })

  it('formats drawdown by multiplying by 100', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('-8.2%')).toBeInTheDocument()
  })

  it('shows — for null executed_amount', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows formatted executed amount when present', () => {
    render(<HistoryCardList rows={[{ ...baseRow, executed_amount: 550 }]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('€550')).toBeInTheDocument()
  })

  it('applies text-red-400 for deep drawdown (drawdown_pct < -10)', () => {
    render(<HistoryCardList rows={[{ ...baseRow, drawdown_pct: -15.0 }]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('-15.0%')).toHaveClass('text-red-400')
  })

  it('does not apply text-red-400 for shallow drawdown', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByText('-8.2%')).not.toHaveClass('text-red-400')
  })

  it('renders an Edit button for each row', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('pre-fills input with recommended_amount when executed_amount is null', async () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(600)
  })

  it('pre-fills input with executed_amount when already set', async () => {
    render(<HistoryCardList rows={[{ ...baseRow, executed_amount: 550 }]} onMarkExecuted={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(550)
  })

  it('calls onMarkExecuted with id and amount when Save clicked', async () => {
    const onMarkExecuted = vi.fn().mockResolvedValue(undefined)
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={onMarkExecuted} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onMarkExecuted).toHaveBeenCalledWith(1, 600))
  })

  it('closes edit mode without calling onMarkExecuted when Cancel clicked', async () => {
    const onMarkExecuted = vi.fn()
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={onMarkExecuted} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onMarkExecuted).not.toHaveBeenCalled()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('opening Edit on a second row closes edit mode on the first', async () => {
    const rows = [baseRow, { ...baseRow, id: 2, created_at: '2026-05-16T10:00:00Z' }]
    render(<HistoryCardList rows={rows} onMarkExecuted={vi.fn()} />)
    const [editBtn1, editBtn2] = screen.getAllByRole('button', { name: /edit/i })
    await userEvent.click(editBtn1)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    await userEvent.click(editBtn2)
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
  })

  it('does not show outcomes toggle for non-executed rows', () => {
    render(<HistoryCardList rows={[baseRow]} onMarkExecuted={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: /toggle outcomes/i })
    ).not.toBeInTheDocument()
  })

  it('shows outcomes toggle for executed rows', () => {
    render(
      <HistoryCardList
        rows={[{ ...baseRow, executed_amount: 550 }]}
        onMarkExecuted={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', { name: /toggle outcomes/i })
    ).toBeInTheDocument()
  })

  it('renders OutcomePanel when toggle is clicked', async () => {
    render(
      <HistoryCardList
        rows={[{ ...baseRow, executed_amount: 550 }]}
        onMarkExecuted={vi.fn()}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: /toggle outcomes/i })
    )
    expect(screen.getByTestId('outcome-panel-1')).toBeInTheDocument()
  })
})
