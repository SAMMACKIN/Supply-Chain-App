import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  Typography,
  Alert,
  Box
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { updateCallOff } from '../../services/calloff-api'
import type { CallOff, CreateCallOffRequest } from '../../types/calloff'
import { useToast } from '../../hooks/useToast'

interface EditCallOffDialogProps {
  callOff: CallOff
  open: boolean
  onClose: () => void
}

export function EditCallOffDialog({ callOff, open, onClose }: EditCallOffDialogProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateCallOffRequest>({
    defaultValues: {
      bundle_qty: callOff.bundle_qty,
      requested_delivery_date: callOff.requested_delivery_date || '',
      fulfillment_location: callOff.fulfillment_location || '',
      delivery_location: callOff.delivery_location || ''
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        bundle_qty: callOff.bundle_qty,
        requested_delivery_date: callOff.requested_delivery_date || '',
        fulfillment_location: callOff.fulfillment_location || '',
        delivery_location: callOff.delivery_location || ''
      })
    }
  }, [open, callOff, reset])

  const updateMutation = useMutation({
    mutationFn: (data: CreateCallOffRequest) => updateCallOff(callOff.call_off_id, data),
    onSuccess: () => {
      toast.success('Call-off updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['call-offs'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update call-off')
    }
  })

  const onSubmit = (data: CreateCallOffRequest) => {
    updateMutation.mutate(data)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Edit Call-Off
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {callOff.call_off_number}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} id="edit-call-off-form">
          <Stack spacing={3}>
              <TextField
                fullWidth
                type="number"
                label="Bundle Quantity (tonnes)"
                {...register('bundle_qty', { 
                  required: 'Bundle quantity is required',
                  min: { value: 1, message: 'Minimum 1 tonne' }
                })}
                error={!!errors.bundle_qty}
                helperText={errors.bundle_qty?.message}
                inputProps={{ min: 1 }}
              />

              <TextField
                fullWidth
                type="date"
                label="Requested Delivery Date"
                {...register('requested_delivery_date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />

              {callOff.direction === 'SELL' && (
                <>
                  <TextField
                    fullWidth
                    label="Fulfillment Location"
                    {...register('fulfillment_location')}
                    placeholder="Warehouse or storage location"
                  />
                  <TextField
                    fullWidth
                    label="Delivery Location"
                    {...register('delivery_location')}
                    placeholder="Customer delivery address"
                  />
                </>
              )}

              <Alert severity="info">
                Note: Counterparty, quota, and incoterm cannot be changed after creation.
              </Alert>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          type="submit"
          form="edit-call-off-form"
          variant="contained"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Updating...' : 'Update Call-Off'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}