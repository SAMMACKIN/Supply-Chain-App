import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ConfirmationDialog } from '../ConfirmationDialog'

describe('ConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Test Confirmation',
    message: 'Are you sure you want to proceed?'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly when open', () => {
    render(<ConfirmationDialog {...defaultProps} />)
    
    expect(screen.getByText('Test Confirmation')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ConfirmationDialog {...defaultProps} open={false} />)
    
    expect(screen.queryByText('Test Confirmation')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    render(<ConfirmationDialog {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    
    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onClose when cancel button is clicked', () => {
    render(<ConfirmationDialog {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('shows severity icons correctly', () => {
    const { rerender } = render(<ConfirmationDialog {...defaultProps} severity="error" />)
    expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument()
    
    rerender(<ConfirmationDialog {...defaultProps} severity="warning" />)
    expect(screen.getByTestId('WarningIcon')).toBeInTheDocument()
    
    rerender(<ConfirmationDialog {...defaultProps} severity="info" />)
    expect(screen.getByTestId('InfoIcon')).toBeInTheDocument()
  })

  it('shows details when available', () => {
    const detailsText = 'Additional details about the action'
    render(<ConfirmationDialog {...defaultProps} details={detailsText} />)
    
    expect(screen.getByText('Show Details')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Show Details'))
    expect(screen.getByText(detailsText)).toBeInTheDocument()
    expect(screen.getByText('Hide Details')).toBeInTheDocument()
  })

  it('handles loading state correctly', () => {
    render(<ConfirmationDialog {...defaultProps} loading={true} />)
    
    const confirmButton = screen.getByRole('button', { name: /processing/i })
    expect(confirmButton).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('handles keyboard interactions', () => {
    const { rerender } = render(<ConfirmationDialog {...defaultProps} />)
    
    // Test Escape key
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalled()
    
    // Reset mocks and test Enter key with fresh render
    vi.clearAllMocks()
    rerender(<ConfirmationDialog {...defaultProps} />)
    
    // Enter key should call onConfirm
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(defaultProps.onConfirm).toHaveBeenCalled()
  })
})