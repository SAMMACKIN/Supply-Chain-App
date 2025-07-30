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
    // Always calculate capacity info, even when no shipment lines exist
    const allocatedCapacity = filteredShipmentLines?.reduce((sum, line) => sum + line.bundle_qty, 0) || 0
    const remainingCapacity = callOff.bundle_qty - allocatedCapacity
    const utilizationPercentage = (allocatedCapacity / callOff.bundle_qty) * 100

    return {
      totalCapacity: callOff.bundle_qty,
      allocatedCapacity,
      remainingCapacity,
      utilizationPercentage,
      isOverAllocated: allocatedCapacity > callOff.bundle_qty,
      allocationBreakdown: filteredShipmentLines?.map(line => ({
        shipmentLineId: line.shipment_line_id,
        bundleQty: line.bundle_qty,
        percentage: (line.bundle_qty / callOff.bundle_qty) * 100,
        status: line.status
      })) || []
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

  const canEdit = !readonly && (callOff.status === 'NEW' || callOff.status === 'CONFIRMED')
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof ShipmentLineFilters]
    return Array.isArray(value) ? value.length > 0 : value !== undefined
  })

  return (
    <Box>
      {/* Header with actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Shipment Lines 
            <Badge badgeContent={filteredShipmentLines.length} color="primary">
              <Box />
            </Badge>
            {hasActiveFilters && (
              <Chip 
                size="small" 
                label="Filtered" 
                color="info" 
                variant="outlined"
                onDelete={clearFilters}
              />
            )}
          </Typography>
          {shipmentLines && shipmentLines.length !== filteredShipmentLines.length && (
            <Typography variant="body2" color="text.secondary">
              Showing {filteredShipmentLines.length} of {shipmentLines.length} shipment lines
            </Typography>
          )}
        </Box>
        
        <Stack direction="row" spacing={1}>
          {/* Filter Button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterIcon />}
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            color={hasActiveFilters ? 'primary' : 'inherit'}
          >
            Filter
          </Button>
          
          {/* Add Shipment Line Button */}
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              disabled={!capacityInfo || capacityInfo.remainingCapacity <= 0}
            >
              Add Shipment Line
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Capacity Visualization */}
      {capacityInfo && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon color="primary" />
                Allocation Progress
              </Typography>
            }
            action={
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
            }
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatQuantity(capacityInfo.allocatedCapacity)} of {formatQuantity(capacityInfo.totalCapacity)} allocated
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatPercentage(capacityInfo.utilizationPercentage)}
                </Typography>
              </Box>
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
              {capacityInfo.remainingCapacity > 0 ? (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  {formatQuantity(capacityInfo.remainingCapacity)} remaining capacity
                </Typography>
              ) : (
                <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                  {capacityInfo.isOverAllocated ? 'Over-allocated' : 'Fully allocated'}
                </Typography>
              )}
            </Box>

            <Collapse in={showCapacityDetails}>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {capacityInfo.allocationBreakdown.map((allocation, index) => (
                  <Grid item xs={12} sm={6} md={4} key={allocation.shipmentLineId}>
                    <Card variant="outlined" size="small">
                      <CardContent sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            Shipment {index + 1}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={allocation.status} 
                            color={statusColors[allocation.status]}
                            icon={getStatusIcon(allocation.status)}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatQuantity(allocation.bundleQty)} ({formatPercentage(allocation.percentage)})
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {quotaBalance && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Quota Impact: This call-off uses {formatPercentage((capacityInfo.allocatedCapacity / quotaBalance.quota_qty_tonnes) * 100)} of quota capacity
                </Alert>
              )}
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedLines.size > 0 && canEdit && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={() => setSelectedLines(new Set())}>
              Clear Selection
            </Button>
          }
        >
          {selectedLines.size} shipment line{selectedLines.size !== 1 ? 's' : ''} selected
        </Alert>
      )}

      {/* Shipment Lines List */}
      {filteredShipmentLines.length > 0 ? (
        <Stack spacing={2}>
          {/* Select All Checkbox */}
          {canEdit && filteredShipmentLines.length > 1 && (
            <Card variant="outlined">
              <CardContent sx={{ py: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedLines.size === filteredShipmentLines.length && filteredShipmentLines.length > 0}
                      indeterminate={selectedLines.size > 0 && selectedLines.size < filteredShipmentLines.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  }
                  label={`Select all ${filteredShipmentLines.length} shipment lines`}
                />
              </CardContent>
            </Card>
          )}

          {filteredShipmentLines.map((line) => (
            <Card 
              key={line.shipment_line_id} 
              variant="outlined"
              sx={{
                backgroundColor: selectedLines.has(line.shipment_line_id) ? 'action.selected' : 'inherit'
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  {/* Selection Checkbox */}
                  {canEdit && (
                    <Box sx={{ pr: 2, pt: 0.5 }}>
                      <Checkbox
                        size="small"
                        checked={selectedLines.has(line.shipment_line_id)}
                        onChange={(e) => handleBulkSelection(line.shipment_line_id, e.target.checked)}
                      />
                    </Box>
                  )}

                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6">
                        {formatQuantity(line.bundle_qty)} {line.metal_code}
                      </Typography>
                      <Chip 
                        label={line.status} 
                        size="small" 
                        color={statusColors[line.status]}
                        icon={getStatusIcon(line.status)}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatPercentage((line.bundle_qty / callOff.bundle_qty) * 100)} of call-off
                      </Typography>
                    </Stack>

                    <Grid container spacing={2}>
                      {line.delivery_location && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            📍 {line.delivery_location}
                          </Typography>
                        </Grid>
                      )}
                      {line.requested_delivery_date && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            📅 Requested: {new Date(line.requested_delivery_date).toLocaleDateString()}
                          </Typography>
                        </Grid>
                      )}
                      {line.expected_ship_date && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            🚢 Ship: {new Date(line.expected_ship_date).toLocaleDateString()}
                          </Typography>
                        </Grid>
                      )}
                      {line.destination_party_id && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            🏢 {line.destination_party_id}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>

                    {line.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        💬 {line.notes}
                      </Typography>
                    )}
                  </Box>

                  {canEdit && (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit shipment line">
                        <IconButton 
                          size="small" 
                          onClick={() => setEditLine(line)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete shipment line">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(line)}
                          color="error"
                          disabled={line.status === 'DELIVERED' || line.status === 'SHIPPED'}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">
          {hasActiveFilters 
            ? 'No shipment lines match the current filters.' 
            : 'No shipment lines created yet. Click "Add Shipment Line" to split this call-off into deliveries.'
          }
        </Alert>
      )}

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 300, p: 2 } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>Filter Shipment Lines</Typography>
        
        <Stack spacing={2}>
          {/* Status Filter */}
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={filters.status || []}
              onChange={(e) => setFilters({...filters, status: e.target.value as ShipmentLineStatus[]})}
              label="Status"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {Object.keys(statusColors).map((status) => (
                <MenuItem key={status} value={status}>
                  <ListItemIcon>
                    {getStatusIcon(status as ShipmentLineStatus)}
                  </ListItemIcon>
                  <ListItemText primary={status} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Bundle Quantity Range */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>Bundle Quantity Range</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Min"
                type="number"
                value={filters.bundleQtyRange?.min || ''}
                onChange={(e) => setFilters({
                  ...filters, 
                  bundleQtyRange: {
                    ...filters.bundleQtyRange,
                    min: e.target.value ? Number(e.target.value) : undefined,
                    max: filters.bundleQtyRange?.max
                  }
                })}
              />
              <TextField
                size="small"
                label="Max"
                type="number"
                value={filters.bundleQtyRange?.max || ''}
                onChange={(e) => setFilters({
                  ...filters, 
                  bundleQtyRange: {
                    ...filters.bundleQtyRange,
                    min: filters.bundleQtyRange?.min,
                    max: e.target.value ? Number(e.target.value) : undefined
                  }
                })}
              />
            </Stack>
          </Box>

          <Divider />
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={clearFilters}>Clear All</Button>
            <Button size="small" onClick={() => setFilterMenuAnchor(null)} variant="contained">
              Apply
            </Button>
          </Stack>
        </Stack>
      </Menu>

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
      <ConfirmationDialog
        open={deleteConfirmation.open}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, open: false })}
        onConfirm={handleDeleteConfirm}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
        details={deleteConfirmation.details}
        severity={deleteConfirmation.severity}
        loading={deleteMutation.isPending}
      />
    </Box>
  )
}