import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Typography,
  Box,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel
} from '@mui/material'
import { createCallOffSchema, type CreateCallOffFormData } from '../../lib/validations'
import { fetchAvailableQuotas, fetchQuotaBalance, createCallOff, updateCallOff } from '../../services/calloff-api'
import { useToast } from '../../hooks/useToast'
import type { CallOff } from '../../types/calloff'

interface CreateCallOffFormMUIProps {
  onSuccess?: (callOff: CallOff) => void
  onCancel?: () => void
  initialQuotaId?: string
  editingCallOff?: CallOff | null
}

export function CreateCallOffFormMUI({ 
  onSuccess, 
  onCancel, 
  initialQuotaId,
  editingCallOff
}: CreateCallOffFormMUIProps) {
  const toast = useToast()
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateCallOffFormData>({
    resolver: zodResolver(createCallOffSchema),
    defaultValues: {
      quota_id: editingCallOff?.quota_id || initialQuotaId || '',
      bundle_qty: editingCallOff?.bundle_qty || 1,
      requested_delivery_date: editingCallOff?.requested_delivery_date 
        ? new Date(editingCallOff.requested_delivery_date).toISOString().split('T')[0]
        : ''
    }
  })

  // Watch quota_id to trigger balance checks
  const selectedQuotaId = watch('quota_id')
  const bundleQty = watch('bundle_qty')

  // Query available quotas
  const { data: quotas, isLoading: quotasLoading, error: quotasError } = useQuery({
    queryKey: ['quotas'],
    queryFn: fetchAvailableQuotas,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Debug logging
  console.log('Quotas loading:', quotasLoading)
  console.log('Quotas data:', quotas)
  console.log('Quotas error:', quotasError)

  // Query quota balance when quota is selected
  const { data: quotaBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['quota-balance', selectedQuotaId],
    queryFn: () => fetchQuotaBalance(selectedQuotaId),
    enabled: !!selectedQuotaId,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Create/Update call-off mutation
  const createCallOffMutation = useMutation({
    mutationFn: async (data: CreateCallOffFormData) => {
      if (editingCallOff) {
        // Update existing call-off
        return updateCallOff(editingCallOff.call_off_id, data)
      } else {
        // Create new call-off
        return createCallOff(data)
      }
    },
    onSuccess: (data) => {
      toast.success(editingCallOff ? 'Call-off updated successfully!' : 'Call-off created successfully!')
      onSuccess?.(data)
    },
    onError: (error: Error) => {
      console.error('Call-off mutation error:', error)
      toast.error(error.message || `Failed to ${editingCallOff ? 'update' : 'create'} call-off`)
    }
  })

  const onSubmit = (data: CreateCallOffFormData) => {
    createCallOffMutation.mutate(data)
  }

  const isQuotaInsufficient = quotaBalance && bundleQty > quotaBalance.remaining_qty_tonnes

  const selectedQuota = quotas?.find(q => q.quota_id === selectedQuotaId)

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          {editingCallOff ? 'Edit Call-Off' : 'Create New Call-Off'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {editingCallOff 
            ? 'Update the call-off details. Only quantity and delivery date can be modified.'
            : 'Create a call-off against an available quota to initiate the fulfillment process.'}
        </Typography>
        
        {/* Debug Info */}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ space: 3 }}>
          {/* Quota Selection */}
          <Box sx={{ mb: 3 }}>
            {quotasLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography variant="body2">Loading quotas...</Typography>
              </Box>
            ) : (
              <Autocomplete
                options={quotas || []}
                getOptionLabel={(quota) => `${quota.metal_code} - ${quota.direction} (${quota.qty_t}t)`}
                value={selectedQuota || null}
                onChange={(_, newValue) => {
                  setValue('quota_id', newValue?.quota_id || '')
                }}
                disabled={!!editingCallOff}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Quota *"
                    error={!!errors.quota_id}
                    helperText={errors.quota_id?.message || (editingCallOff ? 'Quota cannot be changed when editing' : '')}
                    fullWidth
                  />
                )}
                renderOption={(props, quota) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {quota.metal_code} - {quota.direction}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {quota.qty_t}t - {format(new Date(quota.period_month), 'MMM yyyy')}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            )}
          </Box>

          {/* Quota Balance Display */}
          {quotaBalance && (
            <Alert 
              severity={isQuotaInsufficient ? "error" : "info"} 
              sx={{ mb: 3 }}
            >
              <Typography variant="body2">
                <strong>Quota Balance:</strong> {quotaBalance.remaining_qty_tonnes} tonnes remaining
                {bundleQty > 0 && (
                  <>
                    <br />
                    <strong>Requested:</strong> {bundleQty} tonnes
                    <br />
                    <strong>After this call-off:</strong> {quotaBalance.remaining_qty_tonnes - bundleQty} tonnes
                  </>
                )}
              </Typography>
            </Alert>
          )}

          {/* Bundle Quantity Input */}
          <TextField
            fullWidth
            type="number"
            label="Bundle Quantity (tonnes) *"
            {...register('bundle_qty', { valueAsNumber: true })}
            error={!!errors.bundle_qty || isQuotaInsufficient}
            helperText={
              errors.bundle_qty?.message ||
              (isQuotaInsufficient ? `Insufficient quota balance. Available: ${quotaBalance?.remaining_qty_tonnes} tonnes` : '')
            }
            inputProps={{ min: 1, max: 10000 }}
            sx={{ mb: 3 }}
          />

          {/* Delivery Date (Optional) */}
          <TextField
            fullWidth
            type="date"
            label="Requested Delivery Date (Optional)"
            {...register('requested_delivery_date')}
            error={!!errors.requested_delivery_date}
            helperText={errors.requested_delivery_date?.message}
            inputProps={{ min: format(addDays(new Date(), 1), 'yyyy-MM-dd') }}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 4 }}
          />

          {/* Form Actions */}
          <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={
                isSubmitting || 
                !selectedQuotaId || 
                isQuotaInsufficient ||
                balanceLoading
              }
              sx={{ flex: 1 }}
            >
              {isSubmitting 
                ? (editingCallOff ? 'Updating...' : 'Creating...') 
                : (editingCallOff ? 'Update Call-Off' : 'Create Call-Off')}
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="large"
              onClick={onCancel}
              sx={{ minWidth: 120 }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}