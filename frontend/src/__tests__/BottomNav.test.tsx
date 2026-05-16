import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'

function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  it('renders all three tab labels', () => {
    renderNav()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
  })

  it('active tab has border-grad-violet class', () => {
    renderNav('/settings')
    const link = screen.getByText('Settings').closest('a')!
    expect(link).toHaveClass('border-grad-violet')
  })

  it('inactive tabs do not have border-grad-violet class', () => {
    renderNav('/settings')
    expect(screen.getByText('Dashboard').closest('a')).not.toHaveClass('border-grad-violet')
    expect(screen.getByText('History').closest('a')).not.toHaveClass('border-grad-violet')
  })

  it('dashboard tab is active at root path', () => {
    renderNav('/')
    expect(screen.getByText('Dashboard').closest('a')).toHaveClass('border-grad-violet')
  })
})
