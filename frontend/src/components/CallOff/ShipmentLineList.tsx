import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { fetchShipmentLines, deleteShipmentLine } from '../../services/calloff-api'
import type { ShipmentLine, ShipmentLineStatus } from '../../types/shipment-line'
import { CreateShipmentLineDialog } from './CreateShipmentLineDialog'
import { EditShipmentLineDialog } from './EditShipmentLineDialog'
import { useToast } from '../../hooks/useToast'
import type { CallOff } from '../../types/calloff'

interface ShipmentLineListProps {
  callOff: CallOff
  readonly?: boolean
}

const statusColors: Record<ShipmentLineStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PLANNED: 'default',
  READY: 'info',
  PICKED: 'warning',
  SHIPPED: 'primary' as any,
  DELIVERED: 'success'
}

export function ShipmentLineList({ callOff, readonly = false }: ShipmentLineListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editLine, setEditLine] = useState<ShipmentLine | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [lineToDelete, setLineToDelete] = useState<ShipmentLine | null>(null)
  
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: shipmentLines, isLoading, error } = useQuery({
    queryKey: ['shipment-lines', callOff.call_off_id],
    queryFn: () => fetchShipmentLines(callOff.call_off_id),
    enabled: !!callOff.call_off_id
  })

  const deleteMutation = useMutation({
    mutationFn: (lineId: string) => deleteShipmentLine(lineId),
    onSuccess: () => {
      toast.success('Shipment line deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['shipment-lines', callOff.call_off_id] })
      setDeleteConfirmOpen(false)
      setLineToDelete(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete shipment line')
    }
  })

  const handleDeleteClick = (line: ShipmentLine) => {
    setLineToDelete(line)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (lineToDelete) {
      deleteMutation.mutate(lineToDelete.shipment_line_id)
    }
  }

  const totalBundles = shipmentLines?.reduce((sum, line) => sum + line.bundle_qty, 0) || 0
  const remainingBundles = callOff.bundle_qty - totalBundles

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={100} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load shipment lines: {(error as Error).message}
      </Alert>
    )
  }

  const canEdit = !readonly && callOff.status === 'NEW'

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">
          Shipment Lines ({shipmentLines?.length || 0})
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            disabled={remainingBundles <= 0}
          >
            Add Shipment Line
          </Button>
        )}
      </Stack>

      {remainingBundles > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {remainingBundles} bundle{remainingBundles !== 1 ? 's' : ''} remaining to be allocated
        </Alert>
      )}

      {shipmentLines && shipmentLines.length > 0 ? (
        <Stack spacing={2}>
          {shipmentLines.map((line) => (
            <Card key={line.shipment_line_id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6">
                        {line.bundle_qty} Bundle{line.bundle_qty !== 1 ? 's' : ''} - {line.metal_code}
                      </Typography>
                      <Chip 
                        label={line.status} 
                        size="small" 
                        color={statusColors[line.status]}
                      />
                    </Stack>

                    <Stack spacing={0.5}>
                      {line.delivery_location && (
                        <Typography variant="body2" color="text.secondary">
                          Delivery Location: {line.delivery_location}
                        </Typography>
                      )}
                      {line.requested_delivery_date && (
                        <Typography variant="body2" color="text.secondary">
                          Requested Delivery: {new Date(line.requested_delivery_date).toLocaleDateString()}
                        </Typography>
                      )}
                      {line.expected_ship_date && (
                        <Typography variant="body2" color="text.secondary">
                          Expected Ship Date: {new Date(line.expected_ship_date).toLocaleDateString()}
                        </Typography>
                      )}
                      {line.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Notes: {line.notes}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  {canEdit && line.status === 'PLANNED' && (
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        onClick={() => setEditLine(line)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteClick(line)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">
          No shipment lines created yet. Click "Add Shipment Line" to split this call-off into deliveries.
        </Alert>
      )}

      {/* Create Dialog */}
      <CreateShipmentLineDialog
        callOff={callOff}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Edit Dialog */}
      {editLine && (
        <EditShipmentLineDialog
          shipmentLine={editLine}
          callOff={callOff}
          open={!!editLine}
          onClose={() => setEditLine(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Shipment Line?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this shipment line of {lineToDelete?.bundle_qty} bundle(s)?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}