import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
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
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Collapse
} from '@mui/material'
import { 
  Close as CloseIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import { createShipmentLine, fetchShipmentLines } from '../../services/calloff-api'
import { api } from '../../services/api-client'
import type { 
  CreateShipmentLineRequest, 
  ValidationError, 
  ShipmentLineValidationResult,
  CapacityVisualization 
} from '../../types/shipment-line'
import type { CallOff, QuotaBalance } from '../../types/calloff'
import { useToast } from '../../hooks/useToast'
import { 
  validateCreateShipmentLine, 
  calculateSmartDefaults, 
  VALID_METAL_CODES,
  generateContextualErrorMessage
} from '../../utils/shipment-validation'
import { formatQuantity, formatPercentage } from '../../utils/quota-balance-utils'

interface CreateShipmentLineDialogProps {
  callOff: CallOff
  open: boolean
  onClose: () => void
}

export function CreateShipmentLineDialog({ callOff, open, onClose }: CreateShipmentLineDialogProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showCapacityDetails, setShowCapacityDetails] = useState(false)
  const [validationResult, setValidationResult] = useState<ShipmentLineValidationResult | null>(null)

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

  // Calculate smart defaults
  const smartDefaults = useMemo(() => 
    calculateSmartDefaults(callOff, existingShipmentLines, quotaBalance),
    [callOff, existingShipmentLines, quotaBalance]
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors }
  } = useForm<CreateShipmentLineRequest>({
    defaultValues: smartDefaults
  })

  // Watch form values for real-time validation
  const watchedValues = useWatch({ control })

  // Real-time validation
  useEffect(() => {
    if (watchedValues.bundle_qty && watchedValues.metal_code) {
      const result = validateCreateShipmentLine(
        watchedValues as CreateShipmentLineRequest,
        callOff,
        existingShipmentLines,
        quotaBalance
      )
      setValidationResult(result)
    }
  }, [watchedValues, callOff, existingShipmentLines, quotaBalance])

  // Update form with smart defaults when they change
  useEffect(() => {
    if (open && smartDefaults) {
      Object.entries(smartDefaults).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof CreateShipmentLineRequest, value)
        }
      })
    }
  }, [open, smartDefaults, setValue])

  // Calculate capacity visualization
  const capacityInfo = useMemo<CapacityVisualization | null>(() => {
    if (!existingShipmentLines) return null

    const allocatedCapacity = existingShipmentLines.reduce((sum, line) => sum + line.bundle_qty, 0)
    const remainingCapacity = callOff.bundle_qty - allocatedCapacity
    const utilizationPercentage = (allocatedCapacity / callOff.bundle_qty) * 100

    return {
      totalCapacity: callOff.bundle_qty,
      allocatedCapacity,
      remainingCapacity,
      utilizationPercentage,
      isOverAllocated: allocatedCapacity > callOff.bundle_qty,
      allocationBreakdown: existingShipmentLines.map(line => ({
        shipmentLineId: line.shipment_line_id,
        bundleQty: line.bundle_qty,
        percentage: (line.bundle_qty / callOff.bundle_qty) * 100,
        status: line.status
      }))
    }
  }, [callOff.bundle_qty, existingShipmentLines])

  const createMutation = useMutation({
    mutationFn: (data: CreateShipmentLineRequest) => createShipmentLine(callOff.call_off_id, data),
    onSuccess: () => {
      toast.success('Shipment line created successfully!')
      queryClient.invalidateQueries({ queryKey: ['shipment-lines', callOff.call_off_id] })
      queryClient.invalidateQueries({ queryKey: ['quota-balance', callOff.quota_id] })
      reset()
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create shipment line')
    }
  })

  const onSubmit = (data: CreateShipmentLineRequest) => {
    // Final validation before submission
    const finalValidation = validateCreateShipmentLine(data, callOff, existingShipmentLines, quotaBalance)
    
    if (!finalValidation.isValid) {
      const errorMessage = finalValidation.errors
        .filter(e => e.severity === 'error')
        .map(e => e.message)
        .join(', ')
      toast.error(`Validation failed: ${errorMessage}`)
      return
    }

    if (finalValidation.hasWarnings) {
      const warningMessage = finalValidation.errors
        .filter(e => e.severity === 'warning')
        .map(e => e.message)
        .join(', ')
      toast.warning(`Warning: ${warningMessage}`)
    }

    // Format dates to ISO strings for API and ensure correct data types
    const formattedData = {
      ...data,
      bundle_qty: Math.floor(data.bundle_qty), // Ensure integer
      expected_ship_date: data.expected_ship_date ? new Date(data.expected_ship_date).toISOString() : undefined,
      requested_delivery_date: data.requested_delivery_date ? new Date(data.requested_delivery_date).toISOString() : undefined,
      destination_party_id: data.destination_party_id && data.destination_party_id.trim() !== '' ? data.destination_party_id : undefined,
      delivery_location: data.delivery_location && data.delivery_location.trim() !== '' ? data.delivery_location : undefined,
      notes: data.notes && data.notes.trim() !== '' ? data.notes : undefined
    }

    createMutation.mutate(formattedData)
  }

  const handleClose = () => {
    reset(smartDefaults)
    setValidationResult(null)
    setShowCapacityDetails(false)
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
        quotaBalance,
        remainingCapacity: capacityInfo?.remainingCapacity
      })
    }
    return defaultText || ''
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Create Shipment Line</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Split {callOff.call_off_number} into deliverable shipments
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Capacity Visualization Card */}
        {capacityInfo && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" fontSize="small" />
                  Call-off Capacity
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowCapacityDetails(!showCapacityDetails)}
                  endIcon={<ExpandMoreIcon sx={{ 
                    transform: showCapacityDetails ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />}
                >
                  Details
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(capacityInfo.utilizationPercentage, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: capacityInfo.utilizationPercentage >= 100 ? '#f44336' : 
                                       capacityInfo.utilizationPercentage >= 90 ? '#ff9800' : '#4caf50'
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                  {formatPercentage(capacityInfo.utilizationPercentage)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {formatQuantity(capacityInfo.allocatedCapacity)} allocated of {formatQuantity(capacityInfo.totalCapacity)}
                </Typography>
                <Chip
                  size="small"
                  label={`${formatQuantity(capacityInfo.remainingCapacity)} remaining`}
                  color={capacityInfo.remainingCapacity > 0 ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>

              <Collapse in={showCapacityDetails}>
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  {quotaBalance && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Quota utilization: {formatPercentage(quotaBalance.utilization_pct)} 
                      ({formatQuantity(quotaBalance.remaining_qty_tonnes)} remaining)
                    </Alert>
                  )}
                  {capacityInfo.allocationBreakdown.length > 0 && (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Current allocations:
                      </Typography>
                      {capacityInfo.allocationBreakdown.map((allocation, index) => (
                        <Box key={allocation.shipmentLineId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            Shipment {index + 1}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {formatQuantity(allocation.bundleQty)}
                            </Typography>
                            <Chip size="small" label={allocation.status} variant="outlined" />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Collapse>
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
                  {generateContextualErrorMessage(error, { callOff, quotaBalance, remainingCapacity: capacityInfo?.remainingCapacity })}
                </Alert>
              ))}
            
            {validationResult.errors
              .filter(error => error.severity === 'warning')
              .map((error, idx) => (
                <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                  {generateContextualErrorMessage(error, { callOff, quotaBalance, remainingCapacity: capacityInfo?.remainingCapacity })}
                </Alert>
              ))}

            {validationResult.isValid && !validationResult.hasWarnings && (
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 1 }}>
                Ready to create shipment line
              </Alert>
            )}
          </Box>
        )}

        <form onSubmit={handleSubmit(onSubmit)} id="shipment-line-form">
          <Stack spacing={3}>
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Required fields:</strong> Bundle Quantity and Metal Code. All other fields are optional.
              </Typography>
            </Alert>
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
                helperText={getFieldHelperText('bundle_qty', 'Amount to allocate to this shipment')}
                inputProps={{ min: 1, step: 1 }}
              />
              
              <FormControl fullWidth required error={!!getFieldError('metal_code') || !!errors.metal_code}>
                <InputLabel id="metal-code-label">Metal Code *</InputLabel>
                <Select
                  {...register('metal_code', { required: 'Metal code is required' })}
                  labelId="metal-code-label"
                  label="Metal Code *"
                  defaultValue=""
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    <em>Select a metal code</em>
                  </MenuItem>
                  {VALID_METAL_CODES.map(code => (
                    <MenuItem key={code} value={code}>
                      {code}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {errors.metal_code?.message || getFieldHelperText('metal_code', 'Metal type for this shipment (Required)')}
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
              helperText={getFieldHelperText('delivery_location', 'Destination warehouse or customer location')}
              placeholder="Warehouse or customer location"
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              fullWidth
              label="Destination Party ID"
              {...register('destination_party_id')}
              error={!!getFieldError('destination_party_id')}
              helperText={getFieldHelperText('destination_party_id', 'Destination party identifier (optional)')}
              placeholder="Leave empty if not applicable"
              inputProps={{ maxLength: 50 }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              {...register('notes')}
              error={!!getFieldError('notes')}
              helperText={getFieldHelperText('notes', 'Additional delivery instructions or requirements')}
              placeholder="Additional delivery instructions or requirements"
              inputProps={{ maxLength: 500 }}
            />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          type="submit"
          form="shipment-line-form"
          variant="contained"
          disabled={createMutation.isPending || (validationResult && !validationResult.isValid)}
          startIcon={validationResult?.isValid ? <CheckCircleIcon /> : undefined}
        >
          {createMutation.isPending ? 'Creating...' : 'Create Shipment Line'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}