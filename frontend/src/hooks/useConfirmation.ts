import { useState, useCallback, useMemo } from 'react'
import type { ConfirmationSeverity } from '../components/common/ConfirmationDialog'

export interface ConfirmationOptions {
  title: string
  message: string
  severity?: ConfirmationSeverity
  confirmButtonText?: string
  cancelButtonText?: string
  details?: string
}

export interface ConfirmationState {
  open: boolean
  options: ConfirmationOptions | null
  resolver: ((confirmed: boolean) => void) | null
  loading: boolean
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    open: false,
    options: null,
    resolver: null,
    loading: false
  })

  // Main confirmation function that returns a promise
  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        options,
        resolver: resolve,
        loading: false
      })
    })
  }, [])

  // Handle confirmation action
  const handleConfirm = useCallback(async () => {
    if (!state.resolver) return

    setState(prev => ({ ...prev, loading: true }))
    
    try {
      state.resolver(true)
    } finally {
      setState({
        open: false,
        options: null,
        resolver: null,
        loading: false
      })
    }
  }, [state.resolver])

  // Handle cancel action
  const handleCancel = useCallback(() => {
    if (!state.resolver) return

    state.resolver(false)
    setState({
      open: false,
      options: null,
      resolver: null,
      loading: false
    })
  }, [state.resolver])

  // Convenience methods for common confirmation types
  const confirmDelete = useCallback((itemName?: string) => {
    return confirm({
      title: 'Confirm Deletion',
      message: itemName 
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      severity: 'error',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    })
  }, [confirm])

  const confirmAction = useCallback((actionName: string, description?: string) => {
    return confirm({
      title: `Confirm ${actionName}`,
      message: description || `Are you sure you want to ${actionName.toLowerCase()}?`,
      severity: 'warning',
      confirmButtonText: actionName,
      cancelButtonText: 'Cancel'
    })
  }, [confirm])

  const confirmDestructive = useCallback((title: string, message: string, actionName: string = 'Confirm') => {
    return confirm({
      title,
      message,
      severity: 'error',
      confirmButtonText: actionName,
      cancelButtonText: 'Cancel'
    })
  }, [confirm])

  const confirmInfo = useCallback((title: string, message: string, actionName: string = 'Continue') => {
    return confirm({
      title,
      message,
      severity: 'info',
      confirmButtonText: actionName,
      cancelButtonText: 'Cancel'
    })
  }, [confirm])

  // Dialog props for the ConfirmationDialog component
  const dialogProps = useMemo(() => ({
    open: state.open,
    onClose: handleCancel,
    onConfirm: handleConfirm,
    loading: state.loading,
    ...(state.options || {})
  }), [state, handleCancel, handleConfirm])

  return {
    // Core confirmation function
    confirm,
    
    // Convenience methods
    confirmDelete,
    confirmAction,
    confirmDestructive,
    confirmInfo,
    
    // Dialog state and handlers
    dialogProps,
    isOpen: state.open,
    isLoading: state.loading,
    
    // Manual control (for edge cases)
    handleConfirm,
    handleCancel
  }
}

// Example usage:
/*
function MyComponent() {
  const { confirm, confirmDelete, dialogProps } = useConfirmation()

  const handleDelete = async () => {
    const confirmed = await confirmDelete('Important Document')
    if (confirmed) {
      // Perform delete action
    }
  }

  const handleCustomAction = async () => {
    const confirmed = await confirm({
      title: 'Custom Action',
      message: 'This will perform a custom action.',
      severity: 'warning',
      confirmButtonText: 'Do It',
      details: 'Additional details about what will happen...'
    })
    
    if (confirmed) {
      // Perform action
    }
  }

  return (
    <div>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={handleCustomAction}>Custom Action</button>
      <ConfirmationDialog {...dialogProps} />
    </div>
  )
}
*/