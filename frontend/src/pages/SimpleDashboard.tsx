import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
} from '@mui/material'
import {
  Assignment as QuotasIcon,
  Description as CallOffsIcon,
  LocalShipping as TransportIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'

const stats = [
  {
    name: 'Active Quotas',
    value: '20',
    change: '+2 from last month',
    changeType: 'positive' as const,
    icon: QuotasIcon,
    color: '#2563eb',
  },
  {
    name: 'Call-Offs Created',
    value: '8',
    change: '+3 this week',
    changeType: 'positive' as const,
    icon: CallOffsIcon,
    color: '#059669',
  },
  {
    name: 'Transport Orders',
    value: '12',
    change: '2 in transit',
    changeType: 'neutral' as const,
    icon: TransportIcon,
    color: '#dc2626',
  },
  {
    name: 'Inventory Bundles',
    value: '1,247',
    change: '98% tracked',
    changeType: 'positive' as const,
    icon: InventoryIcon,
    color: '#7c3aed',
  },
]

const recentCallOffs = [
  { id: 'CO-2025-001', customer: 'Acme Corp', status: 'Pending', qty: '25t' },
  { id: 'CO-2025-002', customer: 'TechCorp', status: 'Approved', qty: '15t' },
  { id: 'CO-2025-003', customer: 'Global Inc', status: 'Shipped', qty: '30t' },
  { id: 'CO-2025-004', customer: 'Steel Works', status: 'Pending', qty: '20t' },
]

export function SimpleDashboard() {
  const theme = useTheme()

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }} data-testid="dashboard-title">
          Supply Chain Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your supply chain operations
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Grid item xs={12} sm={6} lg={3} key={stat.name}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: `${stat.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ fontSize: 24, color: stat.color }} />
                    </Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {stat.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: stat.changeType === 'positive' ? 'success.main' : 
                             stat.changeType === 'negative' ? 'error.main' : 'text.secondary',
                      fontWeight: 500,
                    }}
                  >
                    {stat.change}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Call-Offs */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Call-Offs
                </Typography>
                <Button
                  component={Link}
                  to="/call-offs"
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="small"
                >
                  Create Call-Off
                </Button>
              </Box>
              
              <Box sx={{ space: 2 }}>
                {recentCallOffs.map((callOff, index) => (
                  <Box
                    key={callOff.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 2,
                      borderBottom: index < recentCallOffs.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {callOff.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {callOff.customer} • {callOff.qty}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: 
                          callOff.status === 'Pending' ? theme.palette.warning.main + '20' :
                          callOff.status === 'Approved' ? theme.palette.info.main + '20' :
                          theme.palette.success.main + '20',
                        color:
                          callOff.status === 'Pending' ? theme.palette.warning.main :
                          callOff.status === 'Approved' ? theme.palette.info.main :
                          theme.palette.success.main,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {callOff.status}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Quick Actions
              </Typography>
              
              <Box sx={{ space: 2 }}>
                <Button
                  component={Link}
                  to="/call-offs"
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{ mb: 2, justifyContent: 'flex-start' }}
                >
                  Create New Call-Off
                </Button>
                
                <Button
                  component={Link}
                  to="/quotas"
                  fullWidth
                  variant="outlined"
                  startIcon={<QuotasIcon />}
                  sx={{ mb: 2, justifyContent: 'flex-start' }}
                >
                  View Quotas
                </Button>
                
                <Button
                  component={Link}
                  to="/transport"
                  fullWidth
                  variant="outlined"
                  startIcon={<TransportIcon />}
                  sx={{ mb: 2, justifyContent: 'flex-start' }}
                >
                  Transport Orders
                </Button>
                
                <Button
                  component={Link}
                  to="/inventory"
                  fullWidth
                  variant="outlined"
                  startIcon={<InventoryIcon />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Check Inventory
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}