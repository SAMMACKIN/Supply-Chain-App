import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  CheckCircle as ConfirmIcon,
  LocalShipping as FulfillIcon
} from '@mui/icons-material'
import { fetchCallOffs, confirmCallOff, cancelCallOff, fulfillCallOff } from '../../services/calloff-api'
import { useToast } from '../../hooks/useToast'
import type { CallOff } from '../../types/calloff'

interface CallOffListProps {
  onCreateCallOff?: () => void
  onViewCallOff?: (callOff: CallOff) => void
  onEditCallOff?: (callOff: CallOff) => void
}

export function CallOffList({ onCreateCallOff, onViewCallOff, onEditCallOff }: CallOffListProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  
  const {
    data: callOffs,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['callOffs'],
    queryFn: fetchCallOffs,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Workflow mutations
  const confirmMutation = useMutation({
    mutationFn: confirmCallOff,
    onSuccess: () => {
      toast.success('Call-off confirmed successfully!')
      queryClient.invalidateQueries({ queryKey: ['callOffs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to confirm call-off')
    }
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelCallOff(id, reason),
    onSuccess: () => {
      toast.success('Call-off cancelled successfully!')
      queryClient.invalidateQueries({ queryKey: ['callOffs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel call-off')
    }
  })

  const fulfillMutation = useMutation({
    mutationFn: fulfillCallOff,
    onSuccess: () => {
      toast.success('Call-off fulfilled successfully!')
      queryClient.invalidateQueries({ queryKey: ['callOffs'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to fulfill call-off')
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'info'
      case 'CONFIRMED': return 'warning'
      case 'FULFILLED': return 'success'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading call-offs...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load call-offs: {error.message}
        <Button onClick={() => refetch()} size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Call-Offs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateCallOff}
          sx={{ borderRadius: 2 }}
        >
          Create Call-Off
        </Button>
      </Box>

      {/* Summary Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {callOffs?.filter(co => co.status === 'NEW').length || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">New</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {callOffs?.filter(co => co.status === 'CONFIRMED').length || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">Confirmed</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {callOffs?.filter(co => co.status === 'FULFILLED').length || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">Fulfilled</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {callOffs?.filter(co => co.status === 'CANCELLED').length || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">Cancelled</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Call-offs Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Call-Off #</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Incoterm</TableCell>
                <TableCell>Delivery Date</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {callOffs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No call-offs found. Create your first call-off to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                callOffs?.map((callOff) => (
                  <TableRow
                    key={callOff.call_off_id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {callOff.call_off_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={callOff.status}
                        color={getStatusColor(callOff.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={callOff.direction}
                        color={callOff.direction === 'BUY' ? 'success' : 'warning'}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {callOff.bundle_qty}t
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {callOff.incoterm_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {callOff.requested_delivery_date
                          ? format(new Date(callOff.requested_delivery_date), 'MMM dd, yyyy')
                          : 'Not specified'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(callOff.created_at), 'MMM dd, yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onViewCallOff?.(callOff)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {callOff.status === 'NEW' && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => onEditCallOff?.(callOff)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Confirm Call-Off">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => confirmMutation.mutate(callOff.call_off_id)}
                                disabled={confirmMutation.isPending}
                              >
                                <ConfirmIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel Call-Off">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => cancelMutation.mutate({ id: callOff.call_off_id })}
                                disabled={cancelMutation.isPending}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {callOff.status === 'CONFIRMED' && (
                          <>
                            <Tooltip title="Fulfill Call-Off">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => fulfillMutation.mutate(callOff.call_off_id)}
                                disabled={fulfillMutation.isPending}
                              >
                                <FulfillIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel Call-Off">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => cancelMutation.mutate({ id: callOff.call_off_id })}
                                disabled={cancelMutation.isPending}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}