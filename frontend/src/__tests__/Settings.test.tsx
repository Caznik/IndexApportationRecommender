import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../pages/Settings'
import { useStore } from '../store'
import * as api from '../api'
import type { Settings as SettingsType } from '../api'

vi.mock('../api')
const mockApi = vi.mocked(api)

const mockProfile: SettingsType = {
  id: 1, base_amount: 500, min_amount: 100, max_amount: 1000, ticker: 'URTH', risk_profile: 'balanced',
}

beforeEach(() => {
  useStore.setState({
    settings: [mockProfile],
    activeTicker: 'URTH',
    settingsLoading: false,
    settingsError: null,
    recommendations: {},
    recommendationRestoredAt: {},
    recommendationLoading: false,
    recommendationError: null,
    history: [],
    historyLoading: false,
    historyError: null,
  })
  vi.clearAllMocks()
  mockApi.saveSettings.mockResolvedValue(mockProfile)
  mockApi.getSettings.mockResolvedValue([mockProfile])
  mockApi.createSettings.mockResolvedValue(mockProfile)
  mockApi.deleteSettings.mockResolvedValue(undefined)
})

describe('Settings', () => {
  it('renders ticker profile card with values from store', () => {
    render(<Settings />)
    expect(screen.getByText('URTH')).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('clicking Edit populates form with profile values', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('Edit form shows ticker as read-only', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    expect(screen.getByText(/ticker cannot be changed/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /ticker/i })).not.toBeInTheDocument()
  })

  it('submitting Edit form calls saveProfile with ticker and update', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(mockApi.saveSettings).toHaveBeenCalledWith('URTH', {
        base_amount: 500,
        min_amount: 100,
        max_amount: 1000,
        risk_profile: 'balanced',
      })
    })
  })

  it('shows validation error when min > max in Edit form', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /edit urth/i }))
    const minInput = screen.getByLabelText(/minimum/i)
    await userEvent.clear(minInput)
    await userEvent.type(minInput, '2000')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/minimum must not exceed maximum/i)).toBeInTheDocument()
    expect(mockApi.saveSettings).not.toHaveBeenCalled()
  })

  it('clicking Add Ticker opens add form', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByText(/\+ add ticker/i))
    expect(screen.getByLabelText(/ticker/i)).toBeInTheDocument()
  })

  it('submitting Add form calls createProfile', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByText(/\+ add ticker/i))
    await userEvent.type(screen.getByLabelText('Ticker'), 'VWRA')
    const baseInputs = screen.getAllByLabelText(/base amount/i)
    await userEvent.type(baseInputs[baseInputs.length - 1], '400')
    const minInputs = screen.getAllByLabelText(/minimum/i)
    await userEvent.type(minInputs[minInputs.length - 1], '100')
    const maxInputs = screen.getAllByLabelText(/maximum/i)
    await userEvent.type(maxInputs[maxInputs.length - 1], '1000')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => expect(mockApi.createSettings).toHaveBeenCalled())
  })

  it('clicking Delete shows confirmation', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /delete urth/i }))
    expect(screen.getByText(/delete urth\?/i)).toBeInTheDocument()
  })

  it('confirming delete calls deleteProfile', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /delete urth/i }))
    await userEvent.click(screen.getByRole('button', { name: /^yes$/i }))
    await waitFor(() => expect(mockApi.deleteSettings).toHaveBeenCalledWith('URTH'))
  })
})
