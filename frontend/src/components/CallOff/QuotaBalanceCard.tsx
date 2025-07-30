import { useMemo } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  Grow,
  Fade,
  useTheme,
  alpha
} from '@mui/material'
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material'
import type { QuotaBalance } from '../../types/calloff'
import { 
  enhanceQuotaBalance,
  calculateCapacityAfterCallOff,
  formatQuantity,
  formatPercentage,
  getProgressBarSx
} from '../../utils/quota-balance-utils'
import type { QuotaBalanceCardEnhancedProps } from '../../types/quota-balance'

interface QuotaBalanceCardProps {
  balance: QuotaBalance
  requestedQty: number
  showAnimation?: boolean
  onCapacityChange?: (newCapacity: number) => void
}

export function QuotaBalanceCard({ 
  balance, 
  requestedQty,
  showAnimation = true,
  onCapacityChange
}: QuotaBalanceCardProps) {
  const theme = useTheme()
  const enhancedBalance = useMemo(() => enhanceQuotaBalance(balance), [balance])
  
  const afterCallOff = useMemo(() => 
    calculateCapacityAfterCallOff(balance, requestedQty),
    [balance, requestedQty]
  )

  // Notify parent of capacity changes
  useMemo(() => {
    if (onCapacityChange) {
      onCapacityChange(afterCallOff.newRemaining)
    }
  }, [afterCallOff.newRemaining, onCapacityChange])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircleIcon fontSize="small" color="success" />
      case 'low_stock':
        return <WarningIcon fontSize="small" color="warning" />
      case 'over_allocated':
        return <ErrorIcon fontSize="small" color="error" />
      default:
        return null
    }
  }

  const toleranceZoneWidth = (balance.tolerance_pct / 100) * 100

  return (
    <Grow in timeout={showAnimation ? 500 : 0}>
      <Card 
        elevation={2}
        sx={{
          borderRadius: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getStatusIcon(enhancedBalance.status)}
            <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
              Quota Information
            </Typography>
            <Chip
              label={enhancedBalance.status === 'available' ? 'Available' :
                     enhancedBalance.status === 'low_stock' ? 'Low Stock' :
                     'Over-allocated'}
              color={enhancedBalance.status_color}
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Box>

          {/* Main Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Quota
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatQuantity(balance.quota_qty_tonnes)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Consumed
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {formatQuantity(balance.consumed_bundles)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Available
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 600,
                  color: afterCallOff.isExceeding ? 'error.main' : 'success.main'
                }}
              >
                {formatQuantity(balance.remaining_qty_tonnes)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current Utilization
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 600,
                  color: enhancedBalance.utilization_pct >= 100 ? 'error.main' : 
                         enhancedBalance.utilization_pct >= 90 ? 'warning.main' : 
                         'text.primary'
                }}
              >
                {formatPercentage(balance.utilization_pct)}
              </Typography>
            </Box>
          </Box>

          {/* Utilization Progress Bar with Tolerance Zone */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Capacity Utilization
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {formatPercentage(Math.min(enhancedBalance.capacity_percentage, 100))}
              </Typography>
            </Box>
            
            <Box sx={{ position: 'relative' }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(enhancedBalance.capacity_percentage, 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  ...getProgressBarSx(enhancedBalance.utilization_pct)
                }}
              />
              
              {/* Tolerance zone indicator */}
              {balance.tolerance_pct > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    width: `${Math.min(toleranceZoneWidth, 20)}%`,
                    height: 8,
                    backgroundColor: alpha(theme.palette.warning.main, 0.3),
                    borderRadius: '0 4px 4px 0',
                    transform: 'translateX(-100%)',
                  }}
                />
              )}
            </Box>
            
            {balance.tolerance_pct > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Tolerance: ±{balance.tolerance_pct}% (max {formatQuantity(balance.quota_qty_tonnes * (1 + balance.tolerance_pct / 100))})
              </Typography>
            )}
          </Box>

          {/* Call-off Preview */}
          {requestedQty > 0 && (
            <Fade in timeout={300}>
              <Box sx={{ 
                p: 2, 
                bgcolor: alpha(theme.palette.info.main, 0.05),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                mb: 2
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  After this call-off:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    New utilization:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: afterCallOff.isExceeding ? 'error.main' : 'primary.main'
                    }}
                  >
                    {formatPercentage(afterCallOff.newUtilization)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Remaining capacity:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: afterCallOff.isExceeding ? 'error.main' : 'success.main'
                    }}
                  >
                    {formatQuantity(afterCallOff.newRemaining)}
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}

          {/* Warning Messages */}
          {afterCallOff.isExceeding && (
            <Fade in timeout={400}>
              <Alert 
                severity="error" 
                icon={<ErrorIcon />}
                sx={{ mb: 1 }}
              >
                Requested quantity exceeds available quota balance
              </Alert>
            </Fade>
          )}

          {!afterCallOff.isExceeding && !afterCallOff.withinTolerance && requestedQty > 0 && (
            <Fade in timeout={400}>
              <Alert 
                severity="warning" 
                icon={<WarningIcon />}
                sx={{ mb: 1 }}
              >
                This call-off will exceed quota tolerance limits
              </Alert>
            </Fade>
          )}

          {enhancedBalance.status === 'low_stock' && requestedQty === 0 && (
            <Fade in timeout={400}>
              <Alert 
                severity="warning" 
                icon={<WarningIcon />}
              >
                Quota is running low on available capacity
              </Alert>
            </Fade>
          )}
        </CardContent>
      </Card>
    </Grow>
  )
}