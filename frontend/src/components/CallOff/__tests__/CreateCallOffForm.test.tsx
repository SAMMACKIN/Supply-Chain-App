import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { CreateCallOffForm } from '../CreateCallOffForm'
import * as calloffApi from '../../../services/calloff-api'
import type { Quota, QuotaBalance, CallOff } from '../../../types/calloff'

// Mock the API module
vi.mock('../../../services/calloff-api', () => ({
  fetchAvailableQuotas: vi.fn(),
  fetchQuotaBalance: vi.fn(),
  createCallOff: vi.fn()
}))

// Mock the toast hook
const mockToast = {
  success: vi.fn(),
  error: vi.fn()
}
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => mockToast
}))

// Mock data
const mockQuotas: Quota[] = [
  {
    quota_id: 'quota-1',
    counterparty_id: 'cp-1',
    direction: 'BUY',
    period_month: '2025-01',
    qty_t: 1000,
    tolerance_pct: 5,
    incoterm_code: 'DAP',
    metal_code: 'CU',
    business_unit_id: 'BU001',
    created_at: '2025-01-01T00:00:00Z',
    counterparty: {
      counterparty_id: 'cp-1',
      company_name: 'Supplier A',
      company_code: 'SA001',
      counterparty_type: 'SUPPLIER',
      country_code: 'US',
      is_active: true
    }
  },
  {
    quota_id: 'quota-2',
    counterparty_id: 'cp-2',
    direction: 'SELL',
    period_month: '2025-02',
    qty_t: 500,
    tolerance_pct: 10,
    incoterm_code: 'FOB',
    metal_code: 'AL',
    business_unit_id: 'BU002',
    created_at: '2025-01-02T00:00:00Z',
    counterparty: {
      counterparty_id: 'cp-2',
      company_name: 'Customer B',
      company_code: 'CB001',
      counterparty_type: 'CUSTOMER',
      country_code: 'UK',
      is_active: true
    }
  }
]

const mockQuotaBalance: QuotaBalance = {
  quota_id: 'quota-1',
  quota_qty_tonnes: 1000,
  consumed_bundles: 200,
  pending_bundles: 50,
  remaining_qty_tonnes: 750,
  tolerance_pct: 5,
  utilization_pct: 20,
  tolerance_status: 'WITHIN_LIMITS',
  call_off_count: 5
}

const mockCallOff: CallOff = {
  call_off_id: 'co-123',
  call_off_number: 'CO-2025-001',
  quota_id: 'quota-1',
  bundle_qty: 100,
  requested_delivery_date: '2025-02-15',
  counterparty_id: 'cp-1',
  direction: 'BUY',
  incoterm_code: 'DAP',
  status: 'NEW',
  created_by: 'user-1',
  created_at: '2025-01-30T10:00:00Z'
}

describe('CreateCallOffForm', () => {
  let queryClient: QueryClient
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  // Helper function to create wrapper
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0
        }
      }
    })
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset API mocks
    vi.mocked(calloffApi.fetchAvailableQuotas).mockResolvedValue(mockQuotas)
    vi.mocked(calloffApi.fetchQuotaBalance).mockResolvedValue(mockQuotaBalance)
    vi.mocked(calloffApi.createCallOff).mockResolvedValue(mockCallOff)
  })

  afterEach(() => {
    queryClient?.clear()
  })

  describe('Initial Rendering', () => {
    it('should render form with all required fields', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Check form title
      expect(screen.getByText('Create New Call-Off')).toBeInTheDocument()
      expect(screen.getByText('Create a call-off against an available quota to initiate the fulfillment process.')).toBeInTheDocument()

      // Check form fields
      expect(screen.getByText(/Select Quota/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Bundle Quantity/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Requested Delivery Date/)).toBeInTheDocument()

      // Check buttons
      expect(screen.getByRole('button', { name: 'Create Call-Off' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()

      // Wait for quotas to load
      await waitFor(() => {
        expect(vi.mocked(calloffApi.fetchAvailableQuotas)).toHaveBeenCalled()
      })
    })

    it('should show loading state for quotas', () => {
      vi.mocked(calloffApi.fetchAvailableQuotas).mockImplementation(() => new Promise(() => {}))

      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Loading quotas...')).toBeInTheDocument()
    })

    it('should set initial quota if provided', async () => {
      render(
        <CreateCallOffForm 
          onSuccess={mockOnSuccess} 
          onCancel={mockOnCancel} 
          initialQuotaId="quota-1" 
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(vi.mocked(calloffApi.fetchQuotaBalance)).toHaveBeenCalledWith('quota-1')
      })
    })
  })

  describe('Quota Selection', () => {
    it('should load and display available quotas', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(vi.mocked(calloffApi.fetchAvailableQuotas)).toHaveBeenCalled()
      })

      // Wait for select to be rendered
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Open select dropdown
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Check if quotas are displayed
      await waitFor(() => {
        expect(screen.getByText('CU - BUY')).toBeInTheDocument()
        expect(screen.getByText('AL - SELL')).toBeInTheDocument()
      })
    })

    it('should fetch quota balance when quota is selected', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait for quotas to load
      await waitFor(() => {
        expect(vi.mocked(calloffApi.fetchAvailableQuotas)).toHaveBeenCalled()
      })

      // Wait for select to be rendered
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Select a quota
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      // Check if balance was fetched
      await waitFor(() => {
        expect(vi.mocked(calloffApi.fetchQuotaBalance)).toHaveBeenCalledWith('quota-1')
      })

      // Check if balance card is displayed
      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
        expect(screen.getByText('1000t')).toBeInTheDocument() // Total quota
        expect(screen.getByText('200t')).toBeInTheDocument() // Consumed
        expect(screen.getByText('750t')).toBeInTheDocument() // Available
      })
    })
  })

  describe('Form Validation', () => {
    it('should require quota selection before submission', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait for form to be ready
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Call-Off' })).toBeInTheDocument()
      })

      // Try to submit without selecting quota - button should be disabled
      const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
      expect(submitButton).toBeDisabled()
    })

    it('should validate bundle quantity is positive', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait for component to be ready
      await waitFor(() => {
        expect(screen.getByLabelText(/Bundle Quantity/)).toBeInTheDocument()
      })

      // Enter invalid quantity
      const qtyInput = screen.getByLabelText(/Bundle Quantity/)
      fireEvent.change(qtyInput, { target: { value: '0' } })

      // Select a quota to enable the submit button
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      // Wait for balance to load
      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
      })

      // Submit form
      const form = screen.getByRole('button', { name: 'Create Call-Off' }).closest('form')!
      fireEvent.submit(form)

      // Check that the API was not called due to validation
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(vi.mocked(calloffApi.createCallOff)).not.toHaveBeenCalled()
    })
  })

  describe('Quota Balance Validation', () => {
    it('should show warning when quantity exceeds available balance', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait for quotas to load
      await waitFor(() => {
        expect(vi.mocked(calloffApi.fetchAvailableQuotas)).toHaveBeenCalled()
      })

      // Wait for select to be rendered
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Select a quota
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      // Wait for balance to load
      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
      })

      // Enter quantity exceeding balance (available is 750)
      const qtyInput = screen.getByLabelText(/Bundle Quantity/)
      fireEvent.change(qtyInput, { target: { value: '800' } })

      // Should show insufficient balance warning
      await waitFor(() => {
        expect(screen.getByText('Insufficient quota balance. Available: 750 tonnes')).toBeInTheDocument()
        expect(screen.getByText('Requested quantity exceeds available quota balance')).toBeInTheDocument()
      })
      
      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
      expect(submitButton).toBeDisabled()
    })

    it('should update utilization preview when quantity changes', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait and select a quota
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      // Wait for balance to load
      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
      })

      // Enter quantity
      const qtyInput = screen.getByLabelText(/Bundle Quantity/)
      fireEvent.change(qtyInput, { target: { value: '100' } })

      // Check utilization calculation (200 consumed + 100 new = 300/1000 = 30%)
      await waitFor(() => {
        expect(screen.getByText('30.0% utilization')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should successfully create call-off with valid data', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait and select a quota
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      // Wait for balance to load
      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
      })

      // Enter quantity
      const qtyInput = screen.getByLabelText(/Bundle Quantity/)
      fireEvent.change(qtyInput, { target: { value: '100' } })

      // Enter delivery date
      const dateInput = screen.getByLabelText(/Requested Delivery Date/)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Check API was called with correct data
      await waitFor(() => {
        expect(vi.mocked(calloffApi.createCallOff)).toHaveBeenCalledWith({
          quota_id: 'quota-1',
          bundle_qty: 100,
          requested_delivery_date: futureDate.toISOString().split('T')[0]
        })
      })

      // Check success callback and toast
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockCallOff)
        expect(mockToast.success).toHaveBeenCalledWith('Call-off created successfully!')
      })
    })

    it('should show loading state during submission', async () => {
      // Make createCallOff take time
      vi.mocked(calloffApi.createCallOff).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockCallOff), 100))
      )
      
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Select quota and enter data
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
      })

      const qtyInput = screen.getByLabelText(/Bundle Quantity/)
      fireEvent.change(qtyInput, { target: { value: '100' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
      fireEvent.click(submitButton)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Failed to create call-off')
      
      vi.mocked(calloffApi.createCallOff).mockRejectedValue(mockError)
      
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait and select quota
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      await waitFor(() => {
        expect(screen.getByText('Quota Information')).toBeInTheDocument()
      })

      const qtyInput = screen.getByLabelText(/Bundle Quantity/)
      fireEvent.change(qtyInput, { target: { value: '100' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
      
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // Should not call success callback but should show error toast
      await waitFor(() => {
        expect(vi.mocked(calloffApi.createCallOff)).toHaveBeenCalled()
        expect(mockOnSuccess).not.toHaveBeenCalled()
        expect(mockToast.error).toHaveBeenCalledWith('Failed to create call-off')
      })
    })
  })

  describe('User Interactions', () => {
    it('should handle cancel button click', () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should disable submit button when no quota selected', () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
      expect(submitButton).toBeDisabled()
    })

    it('should disable submit button when balance is loading', async () => {
      // Make balance fetch take time
      vi.mocked(calloffApi.fetchQuotaBalance).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      )
      
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait and select a quota
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)
      const option = await screen.findByText('CU - BUY')
      fireEvent.click(option)

      // Submit button should be disabled while loading balance
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Create Call-Off' })
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Search Functionality in Quota Selector', () => {
    it('should filter quotas by metal code', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait for select to be rendered
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Open select dropdown
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Type in search
      const searchInput = await screen.findByPlaceholderText('Search by metal or direction...')
      fireEvent.change(searchInput, { target: { value: 'CU' } })

      // Should only show copper quota
      await waitFor(() => {
        expect(screen.getByText('CU - BUY')).toBeInTheDocument()
        expect(screen.queryByText('AL - SELL')).not.toBeInTheDocument()
      })
    })

    it('should show no results message when search has no matches', async () => {
      render(
        <CreateCallOffForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
        { wrapper: createWrapper() }
      )

      // Wait and open select dropdown
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Type in search with no matches
      const searchInput = await screen.findByPlaceholderText('Search by metal or direction...')
      fireEvent.change(searchInput, { target: { value: 'XYZ' } })

      // Should show no results message
      await waitFor(() => {
        expect(screen.getByText('No quotas found matching "XYZ"')).toBeInTheDocument()
      })
    })
  })
})