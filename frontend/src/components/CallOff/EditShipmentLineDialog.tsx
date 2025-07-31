import { useEffect, useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Stack,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse
} from '@mui/material'
import { 
  Close as CloseIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material'
import { updateShipmentLine, fetchShipmentLines } from '../../services/calloff-api'
import { api } from '../../services/api-client'
import type { 
  ShipmentLine, 
  UpdateShipmentLineRequest, 
  ShipmentLineStatus,
  ValidationError,
  ShipmentLineValidationResult,
  BusinessRuleValidationResult
} from '../../types/shipment-line'
import type { CallOff, QuotaBalance } from '../../types/calloff'
import { useToast } from '../../hooks/useToast'
import { ConfirmationDialog } from '../common/ConfirmationDialog'
import { 
  validateUpdateShipmentLine, 
  validateStatusTransition, 
  STATUS_TRANSITIONS,
  VALID_METAL_CODES,
  canEditShipmentLine,
  generateContextualErrorMessage
} from '../../utils/shipment-validation'
import { formatQuantity, formatPercentage } from '../../utils/quota-balance-utils'

interface EditShipmentLineDialogProps {
  shipmentLine: ShipmentLine
  callOff: CallOff
  open: boolean
  onClose: () => void
}

export function EditShipmentLineDialog({ shipmentLine, callOff, open, onClose }: EditShipmentLineDialogProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [validationResult, setValidationResult] = useState<ShipmentLineValidationResult & { businessRules?: BusinessRuleValidationResult } | null>(null)
  const [showChangeHistory, setShowChangeHistory] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<ShipmentLineStatus | null>(null)
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean
    title: string
    message: string
    details?: string
    severity: 'warning' | 'error'
    onConfirm: () => void
  } | null>(null)

  // Check edit permissions
  const editPermissions = useMemo(() => canEditShipmentLine(shipmentLine, callOff), [shipmentLine, callOff])

  // Fetch existing shipment lines for validation
  const { data: existingShipmentLines = [] } = useQuery({
    queryKey: ['shipment-lines', callOff.call_off_id],
    queryFn: () => fetchShipmentLines(callOff.call_off_id),
    enabled: open
  })

  // Fetch quota balance for enhanced validation
  const { data: quotaBalance } = useQuery({
    queryKey: ['quota-balance', callOff.quota_id],
    queryFn: () => api.quotas.getBalance(callOff.quota_id),
    enabled: open && !!callOff.quota_id,
    select: (response) => response.data
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty }
  } = useForm<UpdateShipmentLineRequest>({
    defaultValues: {
      bundle_qty: shipmentLine.bundle_qty,
      metal_code: shipmentLine.metal_code,
      destination_party_id: shipmentLine.destination_party_id || '',
      expected_ship_date: shipmentLine.expected_ship_date || '',
      delivery_location: shipmentLine.delivery_location || '',
      requested_delivery_date: shipmentLine.requested_delivery_date || '',
      notes: shipmentLine.notes || '',
      status: shipmentLine.status
    }
  })

  // Watch form values for real-time validation and change tracking
  const watchedValues = useWatch({ control })

  // Get allowed status transitions
  const allowedStatuses = useMemo(() => {
    return STATUS_TRANSITIONS[shipmentLine.status] || []
  }, [shipmentLine.status])

  // Track changes for visual indicators
  const changes = useMemo(() => {
    const changeList: Array<{ field: string; oldValue: any; newValue: any; label: string }> = []
    
    if (watchedValues.bundle_qty && watchedValues.bundle_qty !== shipmentLine.bundle_qty) {
      changeList.push({
        field: 'bundle_qty',
        oldValue: shipmentLine.bundle_qty,
        newValue: watchedValues.bundle_qty,
        label: 'Bundle Quantity'
      })
    }
    
    if (watchedValues.metal_code && watchedValues.metal_code !== shipmentLine.metal_code) {
      changeList.push({
        field: 'metal_code',
        oldValue: shipmentLine.metal_code,
        newValue: watchedValues.metal_code,
        label: 'Metal Code'
      })
    }
    
    if (watchedValues.status && watchedValues.status !== shipmentLine.status) {
      changeList.push({
        field: 'status',
        oldValue: shipmentLine.status,
        newValue: watchedValues.status,
        label: 'Status'
      })
    }

    if (watchedValues.expected_ship_date !== shipmentLine.expected_ship_date) {
      changeList.push({
        field: 'expected_ship_date',
        oldValue: shipmentLine.expected_ship_date || 'Not set',
        newValue: watchedValues.expected_ship_date || 'Not set',
        label: 'Expected Ship Date'
      })
    }

    if (watchedValues.requested_delivery_date !== shipmentLine.requested_delivery_date) {
      changeList.push({
        field: 'requested_delivery_date',
        oldValue: shipmentLine.requested_delivery_date || 'Not set',
        newValue: watchedValues.requested_delivery_date || 'Not set',
        label: 'Requested Delivery Date'
      })
    }

    if (watchedValues.delivery_location !== shipmentLine.delivery_location) {
      changeList.push({
        field: 'delivery_location',
        oldValue: shipmentLine.delivery_location || 'Not set',
        newValue: watchedValues.delivery_location || 'Not set',
        label: 'Delivery Location'
      })
    }

    if (watchedValues.destination_party_id !== shipmentLine.destination_party_id) {
      changeList.push({
        field: 'destination_party_id',
        oldValue: shipmentLine.destination_party_id || 'Not set',
        newValue: watchedValues.destination_party_id || 'Not set',
        label: 'Destination Party ID'
      })
    }

    if (watchedValues.notes !== shipmentLine.notes) {
      changeList.push({
        field: 'notes',
        oldValue: shipmentLine.notes || 'Not set',
        newValue: watchedValues.notes || 'Not set',
        label: 'Notes'
      })
    }

    return changeList
  }, [watchedValues, shipmentLine])

  // Real-time validation
  useEffect(() => {
    if (Object.keys(watchedValues).length > 0) {
      const result = validateUpdateShipmentLine(
        watchedValues as UpdateShipmentLineRequest,
        shipmentLine,
        callOff,
        existingShipmentLines,
        quotaBalance
      )
      setValidationResult(result)
    }
  }, [watchedValues, shipmentLine, callOff, existingShipmentLines, quotaBalance])

  useEffect(() => {
    if (open) {
      reset({
        bundle_qty: shipmentLine.bundle_qty,
        metal_code: shipmentLine.metal_code,
        destination_party_id: shipmentLine.destination_party_id || '',
        expected_ship_date: shipmentLine.expected_ship_date || '',
        delivery_location: shipmentLine.delivery_location || '',
        requested_delivery_date: shipmentLine.requested_delivery_date || '',
        notes: shipmentLine.notes || '',
        status: shipmentLine.status
      })
      setValidationResult(null)
      setShowChangeHistory(false)
      setPendingStatusChange(null)
    }
  }, [open, shipmentLine, reset])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateShipmentLineRequest) => 
      updateShipmentLine(shipmentLine.shipment_line_id, data),
    onSuccess: () => {
      toast.success('Shipment line updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['shipment-lines', callOff.call_off_id] })
      queryClient.invalidateQueries({ queryKey: ['quota-balance', callOff.quota_id] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shipment line')
    }
  })

  const handleStatusChange = (newStatus: ShipmentLineStatus) => {
    const transition = validateStatusTransition(shipmentLine.status, newStatus)
    
    if (!transition.isValid) {
      toast.error(transition.error?.message || 'Invalid status transition')
      return
    }

    if (transition.requiresConfirmation) {
      setPendingStatusChange(newStatus)
      setConfirmationDialog({
        open: true,
        title: `Change Status to ${newStatus}?`,
        message: `This will change the shipment line status from ${shipmentLine.status} to ${newStatus}.`,
        details: transition.warning?.message,
        severity: 'warning',
        onConfirm: () => {
          setValue('status', newStatus)
          setPendingStatusChange(null)
          setConfirmationDialog(null)
        }
      })
    } else {
      setValue('status', newStatus)
    }
  }

  const onSubmit = (data: UpdateShipmentLineRequest) => {
    // Final validation before submission
    const finalValidation = validateUpdateShipmentLine(
      data, 
      shipmentLine, 
      callOff, 
      existingShipmentLines, 
      quotaBalance
    )
    
    if (!finalValidation.isValid) {
      const errorMessage = finalValidation.errors
        .filter(e => e.severity === 'error')
        .map(e => e.message)
        .join(', ')
      toast.error(`Validation failed: ${errorMessage}`)
      return
    }

    // Only send changed fields
    const changeData: UpdateShipmentLineRequest = {}
    changes.forEach(change => {
      let value = change.newValue
      // Format dates to ISO strings for API
      if ((change.field === 'expected_ship_date' || change.field === 'requested_delivery_date') && value && value !== 'Not set') {
        value = new Date(value).toISOString()
      }
      // Handle empty strings for optional fields
      if (change.field === 'destination_party_id' && (value === '' || value === 'Not set')) {
        value = undefined
      }
      // Ensure bundle_qty is an integer
      if (change.field === 'bundle_qty' && typeof value === 'number') {
        value = Math.floor(value)
      }
      (changeData as any)[change.field] = value
    })

    if (Object.keys(changeData).length === 0) {
      toast.info('No changes to save')
      onClose()
      return
    }

    // Check for destructive changes that need confirmation
    const hasDestructiveChanges = changes.some(change => 
      change.field === 'status' && 
      (change.newValue === 'DELIVERED' || change.newValue === 'SHIPPED')
    )

    if (hasDestructiveChanges && !pendingStatusChange) {
      setConfirmationDialog({
        open: true,
        title: 'Confirm Changes',
        message: 'You are making changes that cannot be easily undone.',
        details: changes.map(c => `${c.label}: ${c.oldValue} → ${c.newValue}`).join('\n'),
        severity: 'warning',
        onConfirm: () => {
          updateMutation.mutate(changeData)
          setConfirmationDialog(null)
        }
      })
      return
    }

    if (finalValidation.hasWarnings) {
      const warningMessage = finalValidation.errors
        .filter(e => e.severity === 'warning')
        .map(e => e.message)
        .join(', ')
      toast.warning(`Warning: ${warningMessage}`)
    }

    updateMutation.mutate(changeData)
  }

  const handleClose = () => {
    if (isDirty && changes.length > 0) {
      setConfirmationDialog({
        open: true,
        title: 'Discard Changes?',
        message: 'You have unsaved changes that will be lost.',
        details: changes.map(c => `${c.label}: ${c.oldValue} → ${c.newValue}`).join('\n'),
        severity: 'warning',
        onConfirm: () => {
          reset()
          setConfirmationDialog(null)
          onClose()
        }
      })
      return
    }
    
    reset()
    onClose()
  }

  const getFieldError = (fieldName: string): ValidationError | undefined => {
    return validationResult?.errors.find(error => error.field === fieldName)
  }

  const getFieldHelperText = (fieldName: string, defaultText?: string): string => {
    const fieldError = getFieldError(fieldName)
    if (fieldError) {
      return generateContextualErrorMessage(fieldError, {
        callOff,
        quotaBalance
      })
    }
    return defaultText || ''
  }

  if (!editPermissions.canEdit) {
    return (
      <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
        <DialogTitle>Cannot Edit Shipment Line</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            {editPermissions.reason}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon color="primary" />
                Edit Shipment Line
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {formatQuantity(shipmentLine.bundle_qty)} {shipmentLine.metal_code} • Status: {shipmentLine.status}
              </Typography>
            </Box>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {/* Changes Summary */}
          {changes.length > 0 && (
            <Card variant="outlined" sx={{ mb: 3, bgcolor: 'warning.50' }}>
              <CardContent sx={{ pb: 2 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningIcon color="warning" fontSize="small" />
                  Pending Changes ({changes.length})
                </Typography>
                <Stack spacing={1}>
                  {changes.map((change, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {change.label}:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label={change.oldValue} variant="outlined" />
                        <Typography variant="body2">→</Typography>
                        <Chip size="small" label={change.newValue} color="warning" variant="outlined" />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Validation Status */}
          {validationResult && (
            <Box sx={{ mb: 3 }}>
              {validationResult.errors
                .filter(error => error.severity === 'error')
                .map((error, idx) => (
                  <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                    {generateContextualErrorMessage(error, { callOff, quotaBalance })}
                  </Alert>
                ))}
              
              {validationResult.errors
                .filter(error => error.severity === 'warning')
                .map((error, idx) => (
                  <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                    {generateContextualErrorMessage(error, { callOff, quotaBalance })}
                  </Alert>
                ))}

              {validationResult.businessRules?.requiresConfirmation && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  This change requires confirmation due to business rules
                </Alert>
              )}

              {validationResult.isValid && !validationResult.hasWarnings && changes.length > 0 && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 1 }}>
                  Changes are valid and ready to save
                </Alert>
              )}
            </Box>
          )}

          <form onSubmit={handleSubmit(onSubmit)} id="edit-shipment-line-form">
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Bundle Quantity (tonnes)"
                  {...register('bundle_qty', { 
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Minimum 1 tonne' },
                    valueAsNumber: true
                  })}
                  error={!!getFieldError('bundle_qty') || !!errors.bundle_qty}
                  helperText={getFieldHelperText('bundle_qty', 'Shipment quantity in tonnes')}
                  inputProps={{ min: 1, step: 1 }}
                />
                
                <FormControl fullWidth required error={!!getFieldError('metal_code') || !!errors.metal_code}>
                  <InputLabel id="metal-code-edit-label">Metal Code *</InputLabel>
                  <Select
                    {...register('metal_code', { required: 'Metal code is required' })}
                    labelId="metal-code-edit-label"
                    label="Metal Code *"
                    defaultValue={shipmentLine.metal_code}
                  >
                    {VALID_METAL_CODES.map(code => (
                      <MenuItem key={code} value={code}>
                        {code}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {getFieldHelperText('metal_code', 'Metal type for this shipment')}
                  </FormHelperText>
                </FormControl>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expected Ship Date"
                  {...register('expected_ship_date')}
                  error={!!getFieldError('expected_ship_date')}
                  helperText={getFieldHelperText('expected_ship_date', 'When this shipment will be sent')}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
                
                <TextField
                  fullWidth
                  type="date"
                  label="Requested Delivery Date"
                  {...register('requested_delivery_date')}
                  error={!!getFieldError('requested_delivery_date')}
                  helperText={getFieldHelperText('requested_delivery_date', 'When customer needs delivery')}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
              </Box>

              <TextField
                fullWidth
                label="Delivery Location"
                {...register('delivery_location')}
                error={!!getFieldError('delivery_location')}
                helperText={getFieldHelperText('delivery_location', 'Destination warehouse or location')}
                placeholder="Warehouse or customer location"
                inputProps={{ maxLength: 100 }}
              />

              <TextField
                fullWidth
                label="Destination Party ID"
                {...register('destination_party_id')}
                error={!!getFieldError('destination_party_id')}
                helperText={getFieldHelperText('destination_party_id', 'Customer or warehouse ID')}
                placeholder="Customer or warehouse ID"
                inputProps={{ maxLength: 50 }}
              />

              <FormControl fullWidth error={!!getFieldError('status')}>
                <InputLabel>Status</InputLabel>
                <Select
                  {...register('status')}
                  value={watchedValues.status || shipmentLine.status}
                  label="Status"
                  onChange={(e) => handleStatusChange(e.target.value as ShipmentLineStatus)}
                >
                  {allowedStatuses.map(status => (
                    <MenuItem key={status} value={status}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {status}
                        {status !== shipmentLine.status && (
                          <Chip size="small" label="New" color="primary" variant="outlined" />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {getFieldHelperText('status', `Allowed transitions: ${allowedStatuses.join(', ')}`)}
                </FormHelperText>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                {...register('notes')}
                error={!!getFieldError('notes')}
                helperText={getFieldHelperText('notes', 'Additional delivery instructions')}
                placeholder="Additional delivery instructions or requirements"
                inputProps={{ maxLength: 500 }}
              />

              {/* Audit Trail Toggle */}
              <Box>
                <Button
                  size="small"
                  onClick={() => setShowChangeHistory(!showChangeHistory)}
                  startIcon={<HistoryIcon />}
                  endIcon={<ExpandMoreIcon sx={{ 
                    transform: showChangeHistory ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />}
                >
                  Change History
                </Button>
                <Collapse in={showChangeHistory}>
                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Created: {new Date(shipmentLine.created_at).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last Modified: {new Date(shipmentLine.updated_at).toLocaleString()}
                      </Typography>
                      {quotaBalance && (
                        <Typography variant="body2" color="text.secondary">
                          Quota Impact: {formatPercentage((shipmentLine.bundle_qty / quotaBalance.quota_qty_tonnes) * 100)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Collapse>
              </Box>
            </Stack>
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-shipment-line-form"
            variant="contained"
            disabled={
              updateMutation.isPending || 
              (validationResult && !validationResult.isValid) ||
              changes.length === 0
            }
            startIcon={changes.length > 0 ? <CheckCircleIcon /> : undefined}
          >
            {updateMutation.isPending ? 'Updating...' : 
             changes.length === 0 ? 'No Changes' : 
             `Save ${changes.length} Change${changes.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      {confirmationDialog && (
        <ConfirmationDialog
          open={confirmationDialog.open}
          onClose={() => setConfirmationDialog(null)}
          onConfirm={confirmationDialog.onConfirm}
          title={confirmationDialog.title}
          message={confirmationDialog.message}
          details={confirmationDialog.details}
          severity={confirmationDialog.severity}
        />
      )}
    </>
  )
}