import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PriceChart } from '../components/PriceChart'
import type { PricePoint } from '../api'

const DATA: PricePoint[] = [
  { date: '2024-01-01', close_price: 95 },
  { date: '2024-01-02', close_price: 97 },
  { date: '2024-01-03', close_price: 96 },
]

describe('PriceChart', () => {
  it('renders without crashing with data', () => {
    const { container } = render(<PriceChart data={DATA} loading={false} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders loading placeholder when loading', () => {
    const { container } = render(<PriceChart data={[]} loading={true} />)
    expect(container.firstChild).toBeTruthy()
  })
})
