import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
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
  IconButton
} from '@mui/material'
import {
  Close as CloseIcon,
  Edit as EditIcon,
  LocalShipping as ShippingIcon,
  AccountBalance as QuotaIcon
} from '@mui/icons-material'
import { fetchQuotaBalance } from '../../services/calloff-api'
import { ShipmentLineList } from './ShipmentLineList'
import type { CallOff } from '../../types/calloff'

interface CallOffDetailViewProps {
  callOff: CallOff
  open: boolean
  onClose: () => void
  onEdit?: (callOff: CallOff) => void
}

export function CallOffDetailView({ callOff, open, onClose, onEdit }: CallOffDetailViewProps) {

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


  // Log errors for debugging
  if (balanceError) {
    console.error('Quota balance fetch error:', balanceError)
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuotaIcon sx={{ fontSize: 20 }} />
                  Basic Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={callOff.status}
                        color={getStatusColor(callOff.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Direction</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={callOff.direction}
                        color={getDirectionColor(callOff.direction) as any}
                        size="small"
                        variant="filled"
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bundle Quantity</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {callOff.bundle_qty} tonnes
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Incoterm</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {callOff.incoterm_code}
                    </Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="body2" color="text.secondary">Requested Delivery Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(callOff.requested_delivery_date)}
                    </Typography>
                  </Box>
                  {/* Location fields for SELL direction */}
                  {callOff.direction === 'SELL' && (
                    <>
                      {callOff.fulfillment_location && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Fulfillment Location</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {callOff.fulfillment_location}
                          </Typography>
                        </Box>
                      )}
                      {callOff.delivery_location && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">Delivery Location</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {callOff.delivery_location}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Quota Information */}
          <Box>
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
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Quota ID</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {callOff.quota_id.slice(0, 8)}...
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total Quota</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {quotaBalance.quota_qty_tonnes} tonnes
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Consumed</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {quotaBalance.consumed_bundles} tonnes
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Remaining</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {quotaBalance.remaining_qty_tonnes} tonnes
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
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
                    </Box>
                  </Box>
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
          </Box>

          {/* Timeline */}
          <Box>
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
          </Box>

          {/* Shipment Lines */}
          <Box>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShippingIcon sx={{ fontSize: 20 }} />
                  Shipment Lines
                </Typography>
                <ShipmentLineList callOff={callOff} readonly={callOff.status !== 'NEW'} />
              </CardContent>
            </Card>
          </Box>
        </Box>
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

    </Dialog>
  )
}