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
  Box,
  Stack,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { updateShipmentLine } from '../../services/calloff-api'
import type { ShipmentLine, UpdateShipmentLineRequest, ShipmentLineStatus } from '../../types/shipment-line'
import type { CallOff } from '../../types/calloff'
import { useToast } from '../../hooks/useToast'

interface EditShipmentLineDialogProps {
  shipmentLine: ShipmentLine
  callOff: CallOff
  open: boolean
  onClose: () => void
}

const statuses: ShipmentLineStatus[] = ['PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED']

export function EditShipmentLineDialog({ shipmentLine, callOff, open, onClose }: EditShipmentLineDialogProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
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
    }
  }, [open, shipmentLine, reset])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateShipmentLineRequest) => 
      updateShipmentLine(shipmentLine.shipment_line_id, data),
    onSuccess: () => {
      toast.success('Shipment line updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['shipment-lines', callOff.call_off_id] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shipment line')
    }
  })

  const onSubmit = (data: UpdateShipmentLineRequest) => {
    // Only send changed fields
    const changes: UpdateShipmentLineRequest = {}
    
    if (data.bundle_qty !== shipmentLine.bundle_qty) changes.bundle_qty = data.bundle_qty
    if (data.metal_code !== shipmentLine.metal_code) changes.metal_code = data.metal_code
    if (data.destination_party_id !== shipmentLine.destination_party_id) changes.destination_party_id = data.destination_party_id
    if (data.expected_ship_date !== shipmentLine.expected_ship_date) changes.expected_ship_date = data.expected_ship_date
    if (data.delivery_location !== shipmentLine.delivery_location) changes.delivery_location = data.delivery_location
    if (data.requested_delivery_date !== shipmentLine.requested_delivery_date) changes.requested_delivery_date = data.requested_delivery_date
    if (data.notes !== shipmentLine.notes) changes.notes = data.notes
    if (data.status !== shipmentLine.status) changes.status = data.status

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save')
      onClose()
      return
    }

    updateMutation.mutate(changes)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Calculate max bundle qty (current + remaining)
  const maxBundleQty = shipmentLine.bundle_qty + (callOff.bundle_qty - 
    (callOff as any).totalAllocatedBundles || shipmentLine.bundle_qty)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Edit Shipment Line
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)} id="edit-shipment-line-form">
          <Stack spacing={3}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Bundle Quantity (tonnes)"
                {...register('bundle_qty', { 
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Minimum 1 tonne' },
                  max: { value: maxBundleQty, message: `Cannot exceed ${maxBundleQty} tonnes` }
                })}
                error={!!errors.bundle_qty}
                helperText={errors.bundle_qty?.message}
                inputProps={{ min: 1, max: maxBundleQty }}
              />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
              <TextField
                fullWidth
                label="Metal Code"
                {...register('metal_code', { required: 'Metal code is required' })}
                error={!!errors.metal_code}
                helperText={errors.metal_code?.message}
                placeholder="CU, AL, ZN, etc."
              />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="Expected Ship Date"
                {...register('expected_ship_date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="Requested Delivery Date"
                {...register('requested_delivery_date')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />

              <TextField
                fullWidth
                label="Delivery Location"
                {...register('delivery_location')}
                placeholder="Warehouse or customer location"
                inputProps={{ maxLength: 100 }}
              />

              <TextField
                fullWidth
                label="Destination Party ID"
                {...register('destination_party_id')}
                placeholder="Customer or warehouse ID"
              />

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  {...register('status')}
                  defaultValue={shipmentLine.status}
                  label="Status"
                >
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Update the shipment line status</FormHelperText>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                {...register('notes')}
                placeholder="Additional delivery instructions or requirements"
              />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          type="submit"
          form="edit-shipment-line-form"
          variant="contained"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Updating...' : 'Update Shipment Line'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}