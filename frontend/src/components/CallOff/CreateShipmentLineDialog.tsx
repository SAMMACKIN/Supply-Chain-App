import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  IconButton,
  Typography
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { createShipmentLine } from '../../services/calloff-api'
import type { CreateShipmentLineRequest } from '../../types/shipment-line'
import type { CallOff } from '../../types/calloff'
import { useToast } from '../../hooks/useToast'

interface CreateShipmentLineDialogProps {
  callOff: CallOff
  open: boolean
  onClose: () => void
}

export function CreateShipmentLineDialog({ callOff, open, onClose }: CreateShipmentLineDialogProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateShipmentLineRequest>({
    defaultValues: {
      bundle_qty: 1,
      metal_code: 'CU', // Default to copper
      destination_party_id: '',
      expected_ship_date: '',
      delivery_location: '',
      requested_delivery_date: '',
      notes: ''
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateShipmentLineRequest) => createShipmentLine(callOff.call_off_id, data),
    onSuccess: () => {
      toast.success('Shipment line created successfully!')
      queryClient.invalidateQueries({ queryKey: ['shipment-lines', callOff.call_off_id] })
      reset()
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create shipment line')
    }
  })

  const onSubmit = (data: CreateShipmentLineRequest) => {
    createMutation.mutate(data)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Create Shipment Line
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Split call-off {callOff.call_off_number} into shipment lines
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} id="shipment-line-form">
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Bundle Quantity (tonnes)"
                {...register('bundle_qty', { 
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Minimum 1 tonne' },
                  max: { value: callOff.bundle_qty, message: `Cannot exceed ${callOff.bundle_qty} tonnes` }
                })}
                error={!!errors.bundle_qty}
                helperText={errors.bundle_qty?.message}
                inputProps={{ min: 1, max: callOff.bundle_qty }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Metal Code"
                {...register('metal_code', { required: 'Metal code is required' })}
                error={!!errors.metal_code}
                helperText={errors.metal_code?.message}
                placeholder="CU, AL, ZN, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Expected Ship Date (Optional)"
                {...register('expected_ship_date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Destination Party ID (Optional)"
                {...register('destination_party_id')}
                placeholder="Customer or warehouse ID"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Delivery Location (Optional)"
                {...register('delivery_location')}
                placeholder="Warehouse or customer location"
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Requested Delivery Date (Optional)"
                {...register('requested_delivery_date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                {...register('notes')}
                placeholder="Additional delivery instructions or requirements"
              />
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
          form="shipment-line-form"
          variant="contained"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating...' : 'Create Shipment Line'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}