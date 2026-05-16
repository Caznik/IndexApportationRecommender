import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../pages/Settings'
import { useStore } from '../store'
import * as api from '../api'
import type { Settings as SettingsType } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const mockSettings: SettingsType = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

beforeEach(() => {
  useStore.setState({
    settings: mockSettings,
    settingsLoading: false,
    settingsError: null,
    recommendation: null, recommendationLoading: false, recommendationError: null,
    history: [], historyLoading: false, historyError: null,
  })
  vi.clearAllMocks()
  mockApi.saveSettings.mockResolvedValue(mockSettings)
  mockApi.getSettings.mockResolvedValue(mockSettings)
})

describe('Settings', () => {
  it('renders form with values from store', () => {
    render(<Settings />)
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('URTH')).toBeInTheDocument()
  })

  it('calls PUT /api/settings with form values on submit', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockApi.saveSettings).toHaveBeenCalledWith({
        base_amount: 500, min_amount: 100, max_amount: 1000,
        ticker: 'URTH', risk_profile: 'balanced',
      })
    })
  })

  it('shows validation error when min > max', async () => {
    render(<Settings />)
    const minInput = screen.getByLabelText(/minimum/i)
    await userEvent.clear(minInput)
    await userEvent.type(minInput, '2000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/minimum must not exceed maximum/i)).toBeInTheDocument()
    expect(mockApi.saveSettings).not.toHaveBeenCalled()
  })

  it('shows success message after save', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument()
    })
  })
})
