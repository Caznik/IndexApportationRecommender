import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OutcomePanel } from '../components/OutcomePanel'
import * as api from '../api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OutcomePanel', () => {
  it('shows loading state initially', () => {
    vi.spyOn(api, 'getOutcomes').mockReturnValue(new Promise(() => {}))
    render(<OutcomePanel id={1} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error message when fetch fails', async () => {
    vi.spyOn(api, 'getOutcomes').mockRejectedValue(new Error('network'))
    render(<OutcomePanel id={1} />)
    await waitFor(() =>
      expect(screen.getByText(/could not load outcomes/i)).toBeInTheDocument()
    )
  })

  it('shows green chip for positive available snapshot', async () => {
    vi.spyOn(api, 'getOutcomes').mockResolvedValue({
      one_m: { status: 'available', price: 94.5, pct: 5.0 },
      three_m: { status: 'available', price: 91.8, pct: 2.0 },
      six_m: { status: 'available', price: 99.0, pct: 10.0 },
    })
    render(<OutcomePanel id={1} />)
    await waitFor(() => expect(screen.getByText('+5.0%')).toBeInTheDocument())
    expect(screen.getByText('+5.0%')).toHaveClass('text-green-400')
  })

  it('shows red chip for negative available snapshot', async () => {
    vi.spyOn(api, 'getOutcomes').mockResolvedValue({
      one_m: { status: 'available', price: 85.0, pct: -5.56 },
      three_m: { status: 'available', price: 88.0, pct: -2.22 },
      six_m: { status: 'available', price: 92.0, pct: 2.22 },
    })
    render(<OutcomePanel id={1} />)
    await waitFor(() => expect(screen.getByText('-5.6%')).toBeInTheDocument())
    expect(screen.getByText('-5.6%')).toHaveClass('text-red-400')
  })

  it('shows countdown chip for pending snapshot', async () => {
    vi.spyOn(api, 'getOutcomes').mockResolvedValue({
      one_m: { status: 'available', price: 94.5, pct: 5.0 },
      three_m: { status: 'pending', days_remaining: 30 },
      six_m: { status: 'pending', days_remaining: 120 },
    })
    render(<OutcomePanel id={1} />)
    await waitFor(() => expect(screen.getByText('in 30d')).toBeInTheDocument())
    expect(screen.getByText('in 120d')).toBeInTheDocument()
  })
})
