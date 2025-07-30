import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Collapse,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material'

export type ConfirmationSeverity = 'info' | 'warning' | 'error'

export interface ConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  severity?: ConfirmationSeverity
  confirmButtonText?: string
  cancelButtonText?: string
  details?: string
  loading?: boolean
  disabled?: boolean
}

const severityConfig = {
  info: {
    icon: InfoIcon,
    color: 'info' as const,
    confirmButtonColor: 'primary' as const
  },
  warning: {
    icon: WarningIcon,
    color: 'warning' as const,
    confirmButtonColor: 'warning' as const
  },
  error: {
    icon: ErrorIcon,
    color: 'error' as const,
    confirmButtonColor: 'error' as const
  }
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  severity = 'info',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  details,
  loading = false,
  disabled = false
}: ConfirmationDialogProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const config = severityConfig[severity]
  const SeverityIcon = config.icon

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setShowDetails(false)
      setIsConfirming(false)
    }
  }, [open])

  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling is expected to be done by the parent component
      console.error('Confirmation action failed:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !disabled && !isConfirming && !loading) {
      event.preventDefault()
      handleConfirm()
    } else if (event.key === 'Escape' && !isConfirming && !loading) {
      event.preventDefault()
      onClose()
    }
  }

  const isLoading = loading || isConfirming

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      onKeyDown={handleKeyDown}
    >
      <DialogTitle id="confirmation-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SeverityIcon color={config.color} />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography 
          id="confirmation-dialog-description" 
          variant="body1" 
          sx={{ mb: details ? 2 : 0 }}
        >
          {message}
        </Typography>

        {details && (
          <Box>
            <Button
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              startIcon={
                <ExpandMoreIcon
                  sx={{
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              }
              sx={{ mb: 1 }}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            <Collapse in={showDetails}>
              <Alert severity={severity} variant="outlined">
                <Typography variant="body2" component="div">
                  {details}
                </Typography>
              </Alert>
            </Collapse>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          color="inherit"
        >
          {cancelButtonText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={config.confirmButtonColor}
          variant="contained"
          disabled={disabled || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
          autoFocus
        >
          {isLoading ? 'Processing...' : confirmButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}