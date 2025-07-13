import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import {
  Close as CloseIcon,
  Edit as EditIcon,
  LocalShipping as ShippingIcon,
  AccountBalance as QuotaIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { fetchQuotaBalance, fetchShipmentLines } from '../../services/calloff-api'
import { CreateShipmentLineDialog } from './CreateShipmentLineDialog'
import type { CallOff } from '../../types/calloff'

interface CallOffDetailViewProps {
  callOff: CallOff
  open: boolean
  onClose: () => void
  onEdit?: (callOff: CallOff) => void
}

export function CallOffDetailView({ callOff, open, onClose, onEdit }: CallOffDetailViewProps) {
  const [showCreateShipmentLine, setShowCreateShipmentLine] = useState(false)

  // Add error boundaries and null checks
  if (!callOff) {
    console.error('CallOffDetailView: callOff prop is null/undefined')
    return null
  }

  // Query quota balance for context
  const { data: quotaBalance, isLoading: balanceLoading, error: balanceError } = useQuery({
    queryKey: ['quota-balance', callOff.quota_id],
    queryFn: () => fetchQuotaBalance(callOff.quota_id),
    enabled: open && !!callOff.quota_id,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Query shipment lines for this call-off
  const { data: shipmentLines, isLoading: shipmentLinesLoading, error: shipmentLinesError } = useQuery({
    queryKey: ['shipment-lines', callOff.call_off_id],
    queryFn: () => fetchShipmentLines(callOff.call_off_id),
    enabled: open && !!callOff.call_off_id,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Log errors for debugging
  if (balanceError) {
    console.error('Quota balance fetch error:', balanceError)
  }
  if (shipmentLinesError) {
    console.error('Shipment lines fetch error:', shipmentLinesError)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'info'
      case 'CONFIRMED': return 'warning'
      case 'FULFILLED': return 'success'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const getDirectionColor = (direction: string) => {
    return direction === 'BUY' ? 'success' : 'warning'
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch (error) {
      console.error('Date formatting error:', error, dateString)
      return 'Invalid date'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch (error) {
      console.error('Date formatting error:', error, dateString)
      return 'Invalid date'
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Call-Off Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {callOff.call_off_number}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuotaIcon sx={{ fontSize: 20 }} />
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={callOff.status}
                        color={getStatusColor(callOff.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Direction</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={callOff.direction}
                        color={getDirectionColor(callOff.direction) as any}
                        size="small"
                        variant="filled"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Bundle Quantity</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {callOff.bundle_qty} tonnes
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Incoterm</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {callOff.incoterm_code}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Requested Delivery Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(callOff.requested_delivery_date)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Quota Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuotaIcon sx={{ fontSize: 20 }} />
                  Quota Information
                </Typography>
                {balanceLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">Loading quota details...</Typography>
                  </Box>
                ) : quotaBalance ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Quota ID</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {callOff.quota_id.slice(0, 8)}...
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Total Quota</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {quotaBalance.quota_qty_tonnes} tonnes
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Consumed</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {quotaBalance.consumed_bundles} tonnes
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Remaining</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {quotaBalance.remaining_qty_tonnes} tonnes
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Utilization</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {quotaBalance.utilization_pct.toFixed(1)}%
                        </Typography>
                        <Chip
                          label={quotaBalance.tolerance_status.replace('_', ' ')}
                          color={quotaBalance.tolerance_status === 'WITHIN_LIMITS' ? 'success' : 'warning'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="warning">
                    Unable to load quota details
                    {balanceError && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Error: {(balanceError as Error).message}
                      </Typography>
                    )}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShippingIcon sx={{ fontSize: 20 }} />
                  Timeline
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Created"
                      secondary={formatDateTime(callOff.created_at)}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  {callOff.confirmed_at && (
                    <ListItem>
                      <ListItemText
                        primary="Confirmed"
                        secondary={formatDateTime(callOff.confirmed_at)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  )}
                  {callOff.fulfilled_at && (
                    <ListItem>
                      <ListItemText
                        primary="Fulfilled"
                        secondary={formatDateTime(callOff.fulfilled_at)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  )}
                  {callOff.cancelled_at && (
                    <ListItem>
                      <ListItemText
                        primary="Cancelled"
                        secondary={formatDateTime(callOff.cancelled_at)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Shipment Lines */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShippingIcon sx={{ fontSize: 20 }} />
                    Shipment Lines
                  </Typography>
                  {['NEW', 'CONFIRMED'].includes(callOff.status) && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setShowCreateShipmentLine(true)}
                    >
                      Add Line
                    </Button>
                  )}
                </Box>
                
                {shipmentLinesLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">Loading shipment lines...</Typography>
                  </Box>
                ) : shipmentLines && shipmentLines.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Metal</TableCell>
                          <TableCell>Expected Ship Date</TableCell>
                          <TableCell>Transport Order</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {shipmentLines.map((line) => (
                          <TableRow key={line.shipment_line_id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {line.bundle_qty} tonnes
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={line.metal_code}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(line.expected_ship_date)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {line.transport_order_id ? line.transport_order_id.slice(0, 8) + '...' : 'Not assigned'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => console.log('Edit shipment line:', line.shipment_line_id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  onClick={() => console.log('Delete shipment line:', line.shipment_line_id)}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No shipment lines created yet. 
                    This call-off contains {callOff.bundle_qty} tonnes that can be split into multiple shipment lines.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        {callOff.status === 'NEW' && onEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              onEdit(callOff)
              onClose()
            }}
          >
            Edit Call-Off
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>

      {/* Create Shipment Line Dialog */}
      <CreateShipmentLineDialog
        callOff={callOff}
        open={showCreateShipmentLine}
        onClose={() => setShowCreateShipmentLine(false)}
      />
    </Dialog>
  )
}