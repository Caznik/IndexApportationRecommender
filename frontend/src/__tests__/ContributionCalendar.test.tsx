import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContributionCalendar } from '../components/ContributionCalendar'
import type { RecommendationRecord } from '../api'

function makeRecord(
  id: number,
  created_at: string,
  executed_amount: number | null,
): RecommendationRecord {
  return {
    id, created_at, ticker: 'URTH',
    market_price: 452.10, drawdown: -0.05, drawdown_pct: -0.05,
    multiplier: 1.0, rule_triggered: 'base', recommended_amount: 150,
    executed_amount, explanation: '',
  }
}

// Pin system time to May 18, 2026 so the initial month is deterministic.
// Only fake `Date` so that setTimeout/Promise timers used by userEvent still work.
function useMay2026() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 4, 18))
}
afterEach(() => vi.useRealTimers())

describe('ContributionCalendar — grid and navigation', () => {
  it('shows the current month label on mount', () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    expect(screen.getByText(/MAY 2026/i)).toBeInTheDocument()
  })

  it('renders an executed day cell with the executed amount', () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    expect(screen.getByText('€150')).toBeInTheDocument()
  })

  it('does not show executed amount for rows with null executed_amount', () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', null)]
    render(<ContributionCalendar rows={rows} />)
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })

  it('navigates to April 2026 when prev is clicked', async () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByText(/APRIL 2026/i)).toBeInTheDocument()
  })

  it('disables the next button when on the current month', () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    expect(screen.getByRole('button', { name: /next month/i })).toBeDisabled()
  })

  it('enables the next button after navigating to a past month', async () => {
    useMay2026()
    render(<ContributionCalendar rows={[]} />)
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByRole('button', { name: /next month/i })).not.toBeDisabled()
  })
})

describe('ContributionCalendar — tooltip', () => {
  it('shows tooltip with record details when an executed cell is clicked', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    await userEvent.click(screen.getByText('€150').closest('button')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    expect(screen.getByText('$452.10')).toBeInTheDocument()
  })

  it('hides the tooltip when Escape is pressed', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    await userEvent.click(screen.getByText('€150').closest('button')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })

  it('closes the tooltip when clicking outside the calendar', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(
      <div>
        <ContributionCalendar rows={rows} />
        <button>outside</button>
      </div>,
    )
    await userEvent.click(screen.getByText('€150').closest('button')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })

  it('closes an open tooltip when the same cell is clicked again', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    const cell = screen.getByText('€150').closest('button')!
    await userEvent.click(cell)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.click(cell)
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })

  it('closes the tooltip when navigating to a previous month', async () => {
    useMay2026()
    const rows = [makeRecord(1, '2026-05-07T10:00:00Z', 150)]
    render(<ContributionCalendar rows={rows} />)
    await userEvent.click(screen.getByText('€150').closest('button')!)
    expect(screen.getByText('Executed')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.queryByText('Executed')).not.toBeInTheDocument()
  })
})
