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
  Grid2 as Grid,
  IconButton,
  Typography,
  Alert
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
      requested_delivery_date: callOff.requested_delivery_date || ''
    }
  })

  useEffect(() => {
    if (open) {
      reset({
        bundle_qty: callOff.bundle_qty,
        requested_delivery_date: callOff.requested_delivery_date || ''
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
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Edit Call-Off
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {callOff.call_off_number}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} id="edit-call-off-form">
          <Grid container spacing={3}>
            <Grid size={12}>
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
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                type="date"
                label="Requested Delivery Date"
                {...register('requested_delivery_date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>

            <Grid size={12}>
              <Alert severity="info">
                Call-off is against {callOff.direction} quota. Other details like counterparty and incoterm cannot be changed after creation.
              </Alert>
            </Grid>
          </Grid>
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