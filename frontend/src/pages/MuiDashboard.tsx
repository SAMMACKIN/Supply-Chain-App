import { useMemo } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  useTheme,
} from '@mui/material'
import {
  Assignment as QuotasIcon,
  Description as CallOffsIcon,
  LocalShipping as TransportIcon,
  Inventory as InventoryIcon,
  TrendingUp,
  Add as AddIcon,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-material.css'

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
    change: '5 in progress',
    changeType: 'neutral' as const,
    icon: TransportIcon,
    color: '#ea580c',
  },
  {
    name: 'Inventory Items',
    value: '1,247',
    change: '98% capacity',
    changeType: 'neutral' as const,
    icon: InventoryIcon,
    color: '#7c3aed',
  },
]

const recentActivity = [
  { action: 'Call-off CO-2025-0001 created', time: '2 hours ago', type: 'call-off', status: 'success' },
  { action: 'Quota QT-CU-2025-07 updated', time: '4 hours ago', type: 'quota', status: 'info' },
  { action: 'Transport order TO-2025-0015 completed', time: '1 day ago', type: 'transport', status: 'success' },
  { action: 'Inventory lot IL-2025-0032 received', time: '2 days ago', type: 'inventory', status: 'warning' },
]

const recentCallOffs = [
  { id: 'CO-2025-0001', customer: 'Acme Corp', part: 'Widget A', quantity: 100, status: 'Pending' },
  { id: 'CO-2025-0002', customer: 'TechCorp Ltd', part: 'Component B', quantity: 50, status: 'Approved' },
  { id: 'CO-2025-0003', customer: 'Global Industries', part: 'Assembly C', quantity: 200, status: 'Shipped' },
]

export function MuiDashboard() {
  const theme = useTheme()

  const columnDefs: ColDef[] = useMemo(() => [
    { field: 'id', headerName: 'Call-Off ID', width: 130, pinned: 'left' },
    { field: 'customer', headerName: 'Customer', width: 160 },
    { field: 'part', headerName: 'Part', width: 140 },
    { field: 'quantity', headerName: 'Quantity', width: 110, type: 'numberColumn' },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: any) => {
        const getStatusColor = (status: string) => {
          switch (status.toLowerCase()) {
            case 'pending': return 'warning'
            case 'approved': return 'info'
            case 'shipped': return 'success'
            default: return 'default'
          }
        }
        return <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      }
    },
  ], [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call-off': return <CallOffsIcon sx={{ color: theme.palette.primary.main }} />
      case 'quota': return <QuotasIcon sx={{ color: theme.palette.success.main }} />
      case 'transport': return <TransportIcon sx={{ color: theme.palette.warning.main }} />
      case 'inventory': return <InventoryIcon sx={{ color: theme.palette.secondary.main }} />
      default: return <CallOffsIcon />
    }
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Welcome section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Welcome back
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your supply chain operations today.
        </Typography>
      </Box>

      {/* Stats grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Grid item xs={12} sm={6} md={3} key={stat.name}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                        {stat.name}
                      </Typography>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: stat.color, width: 56, height: 56 }}>
                      <Icon sx={{ fontSize: 28 }} />
                    </Avatar>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp 
                      sx={{ 
                        fontSize: 16, 
                        color: stat.changeType === 'positive' ? theme.palette.success.main : theme.palette.text.secondary 
                      }} 
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: stat.changeType === 'positive' ? theme.palette.success.main : theme.palette.text.secondary 
                      }}
                    >
                      {stat.change}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick actions */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  component={Link}
                  to="/call-offs/create"
                  sx={{ borderRadius: 2 }}
                >
                  Create Call-Off
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/quotas"
                  sx={{ borderRadius: 2 }}
                >
                  View Quotas
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/inventory"
                  sx={{ borderRadius: 2 }}
                >
                  Check Inventory
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/transport"
                  sx={{ borderRadius: 2 }}
                >
                  Schedule Transport
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent activity */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Recent Activity
              </Typography>
              <List dense>
                {recentActivity.map((activity, index) => (
                  <Box key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'transparent' }}>
                          {getActivityIcon(activity.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.action}
                        secondary={activity.time}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent call-offs with AG Grid */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Call-Offs
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  component={Link}
                  to="/call-offs"
                  sx={{ borderRadius: 2 }}
                >
                  View All
                </Button>
              </Box>
              <Box 
                className={theme.palette.mode === 'dark' ? 'ag-theme-material-dark' : 'ag-theme-material'}
                sx={{ height: 300, width: '100%' }}
              >
                <AgGridReact
                  rowData={recentCallOffs}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    flex: 1,
                    minWidth: 100,
                    resizable: true,
                    sortable: true,
                    filter: true,
                  }}
                  animateRows={true}
                  rowSelection="single"
                  pagination={false}
                  suppressRowClickSelection={true}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}