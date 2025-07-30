import { useState, useMemo } from 'react'
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
  DialogActions,
  LinearProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Checkbox,
  FormControlLabel,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
  Grid,
  CardHeader,
  Collapse
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Schedule as ScheduleIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material'
import { fetchShipmentLines, deleteShipmentLine } from '../../services/calloff-api'
import { api } from '../../services/api-client'
import type { 
  ShipmentLine, 
  ShipmentLineStatus, 
  ShipmentLineFilters,
  CapacityVisualization
} from '../../types/shipment-line'
import type { CallOff, QuotaBalance } from '../../types/calloff'
import { CreateShipmentLineDialog } from './CreateShipmentLineDialog'
import { EditShipmentLineDialog } from './EditShipmentLineDialog'
import { ConfirmationDialog } from '../common/ConfirmationDialog'
import { useToast } from '../../hooks/useToast'
import { canDeleteShipmentLine } from '../../utils/shipment-validation'
import { formatQuantity, formatPercentage } from '../../utils/quota-balance-utils'

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

const statusIcons: Record<ShipmentLineStatus, typeof ScheduleIcon> = {
  PLANNED: ScheduleIcon,
  READY: AssignmentIcon,
  PICKED: TimelineIcon,
  SHIPPED: ShippingIcon,
  DELIVERED: CheckCircleIcon
}

export function ShipmentLineList({ callOff, readonly = false }: ShipmentLineListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editLine, setEditLine] = useState<ShipmentLine | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    shipmentLine: ShipmentLine | null
    title: string
    message: string
    details?: string
    severity: 'warning' | 'error'
  }>({ open: false, shipmentLine: null, title: '', message: '', severity: 'warning' })
  
  // Filtering and display state
  const [filters, setFilters] = useState<ShipmentLineFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showCapacityDetails, setShowCapacityDetails] = useState(false)
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: shipmentLines, isLoading, error } = useQuery({
    queryKey: ['shipment-lines', callOff.call_off_id],
    queryFn: () => fetchShipmentLines(callOff.call_off_id),
    enabled: !!callOff.call_off_id
  })

  // Fetch quota balance for enhanced capacity visualization
  const { data: quotaBalance } = useQuery({
    queryKey: ['quota-balance', callOff.quota_id],
    queryFn: () => api.quotas.getBalance(callOff.quota_id),
    enabled: !!callOff.quota_id,
    select: (response) => response.data
  })

  // Filter shipment lines based on current filters
  const filteredShipmentLines = useMemo(() => {
    if (!shipmentLines) return []
    
    return shipmentLines.filter(line => {
      // Status filter
      if (filters.status && filters.status.length > 0 && !filters.status.includes(line.status)) {
        return false
      }
      
      // Metal code filter
      if (filters.metalCode && filters.metalCode.length > 0 && !filters.metalCode.includes(line.metal_code)) {
        return false
      }
      
      // Bundle quantity range filter
      if (filters.bundleQtyRange) {
        const { min, max } = filters.bundleQtyRange
        if ((min !== undefined && line.bundle_qty < min) || (max !== undefined && line.bundle_qty > max)) {
          return false
        }
      }
      
      // Date range filter
      if (filters.dateRange) {
        const { start, end, field } = filters.dateRange
        const dateValue = line[field]
        if (!dateValue) return false
        
        const lineDate = new Date(dateValue)
        const startDate = new Date(start)
        const endDate = new Date(end)
        
        if (lineDate < startDate || lineDate > endDate) {
          return false
        }
      }
      
      return true
    })
  }, [shipmentLines, filters])

  // Calculate capacity visualization
  const capacityInfo = useMemo<CapacityVisualization | null>(() => {
    if (!filteredShipmentLines.length) return null

    const allocatedCapacity = filteredShipmentLines.reduce((sum, line) => sum + line.bundle_qty, 0)
    const remainingCapacity = callOff.bundle_qty - allocatedCapacity
    const utilizationPercentage = (allocatedCapacity / callOff.bundle_qty) * 100

    return {
      totalCapacity: callOff.bundle_qty,
      allocatedCapacity,
      remainingCapacity,
      utilizationPercentage,
      isOverAllocated: allocatedCapacity > callOff.bundle_qty,
      allocationBreakdown: filteredShipmentLines.map(line => ({
        shipmentLineId: line.shipment_line_id,
        bundleQty: line.bundle_qty,
        percentage: (line.bundle_qty / callOff.bundle_qty) * 100,
        status: line.status
      }))
    }
  }, [filteredShipmentLines, callOff.bundle_qty])

  const deleteMutation = useMutation({
    mutationFn: (lineId: string) => deleteShipmentLine(lineId),
    onSuccess: () => {
      toast.success('Shipment line deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['shipment-lines', callOff.call_off_id] })
      queryClient.invalidateQueries({ queryKey: ['quota-balance', callOff.quota_id] })
      setDeleteConfirmation({ ...deleteConfirmation, open: false, shipmentLine: null })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete shipment line')
    }
  })

  const handleDeleteClick = (line: ShipmentLine) => {
    const deleteCheck = canDeleteShipmentLine(line, callOff)
    
    if (!deleteCheck.canDelete) {
      toast.error(deleteCheck.reason || 'Cannot delete this shipment line')
      return
    }

    setDeleteConfirmation({
      open: true,
      shipmentLine: line,
      title: 'Delete Shipment Line?',
      message: `Are you sure you want to delete this shipment line of ${formatQuantity(line.bundle_qty)} ${line.metal_code}?`,
      details: deleteCheck.requiresConfirmation ? deleteCheck.reason : undefined,
      severity: deleteCheck.requiresConfirmation ? 'warning' : 'error'
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteConfirmation.shipmentLine) {
      deleteMutation.mutate(deleteConfirmation.shipmentLine.shipment_line_id)
    }
  }

  const handleBulkSelection = (lineId: string, selected: boolean) => {
    const newSelection = new Set(selectedLines)
    if (selected) {
      newSelection.add(lineId)
    } else {
      newSelection.delete(lineId)
    }
    setSelectedLines(newSelection)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLines(new Set(filteredShipmentLines.map(line => line.shipment_line_id)))
    } else {
      setSelectedLines(new Set())
    }
  }

  const clearFilters = () => {
    setFilters({})
    setFilterMenuAnchor(null)
  }

  const getStatusIcon = (status: ShipmentLineStatus) => {
    const IconComponent = statusIcons[status]
    return <IconComponent fontSize="small" />
  }

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