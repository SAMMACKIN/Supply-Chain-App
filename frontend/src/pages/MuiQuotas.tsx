import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Chip,
  useTheme,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  PlayArrow as CreateCallOffIcon
} from '@mui/icons-material'
import { fetchAvailableQuotas } from '../services/calloff-api'
import type { Quota } from '../types/calloff'
import { CreateCallOffWizard } from '../components/CallOff/CreateCallOffWizard'

export function MuiQuotas() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [selectedQuota, setSelectedQuota] = useState<Quota | undefined>()

  // Query available quotas from Supabase
  const { data: quotas, isLoading, error, refetch } = useQuery({
    queryKey: ['quotas'],
    queryFn: fetchAvailableQuotas,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const getDirectionColor = (direction: string) => {
    return direction === 'BUY' ? 'success' : 'warning'
  }

  const filteredData = useMemo(() => {
    if (!quotas || !searchText) return quotas || []
    return quotas.filter(quota =>
      quota.quota_id.toLowerCase().includes(searchText.toLowerCase()) ||
      quota.metal_code.toLowerCase().includes(searchText.toLowerCase()) ||
      quota.direction.toLowerCase().includes(searchText.toLowerCase()) ||
      quota.incoterm_code.toLowerCase().includes(searchText.toLowerCase()) ||
      quota.counterparty?.company_name.toLowerCase().includes(searchText.toLowerCase()) ||
      quota.counterparty?.company_code.toLowerCase().includes(searchText.toLowerCase())
    )
  }, [quotas, searchText])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading quotas...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load quotas: {(error as Error).message}
        <Button onClick={() => refetch()} size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Quotas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View available quotas and create call-offs ({filteredData.length} quota{filteredData.length !== 1 ? 's' : ''} found)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2 }}
        >
          New Quota
        </Button>
      </Box>

      {/* Filters */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search quotas..."
              variant="outlined"
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              sx={{ borderRadius: 2 }}
            >
              Filter
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Quotas Table */}
      <Card elevation={2}>
        <TableContainer component={Paper} data-testid="quotas-table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Quote #</TableCell>
                <TableCell>Counterparty</TableCell>
                <TableCell>Metal</TableCell>
                <TableCell>Direction</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Tolerance</TableCell>
                <TableCell>Incoterm</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No quotas found. {searchText ? 'Try adjusting your search.' : 'Create your first quota to get started.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((quota, index) => {
                  // Generate temporary quota number: use index + 1 as trade ID, .1 as sequence
                  const quoteNumber = `${(index + 100)}.1`;
                  
                  return (
                    <TableRow
                      key={quota.quota_id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main, fontFamily: 'monospace' }}>
                          {quoteNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {quota.counterparty?.company_name || 'Unknown Company'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {quota.counterparty?.company_code || quota.counterparty_id.slice(0, 8)} • {quota.counterparty?.country_code || 'XX'}
                        </Typography>
                      </TableCell>
                    <TableCell>
                      <Chip 
                        label={quota.metal_code} 
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={quota.direction} 
                        color={getDirectionColor(quota.direction) as any}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {quota.qty_t} tonnes
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(quota.period_month), 'MMM yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        ±{quota.tolerance_pct}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {quota.incoterm_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(quota.created_at), 'MMM dd, yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Quota Details">
                          <IconButton
                            size="small"
                            onClick={() => console.log('View quota:', quota.quota_id)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Create Call-Off">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedQuota(quota)
                              setShowCreateWizard(true)
                            }}
                          >
                            <CreateCallOffIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Call-Off Wizard */}
      <CreateCallOffWizard
        open={showCreateWizard}
        onClose={() => {
          setShowCreateWizard(false)
          setSelectedQuota(undefined)
        }}
        onSuccess={(callOff) => {
          // Navigate to call-offs page with the new call-off selected
          navigate('/mui/call-offs', { state: { selectedCallOffId: callOff.call_off_id } })
        }}
        initialQuota={selectedQuota}
      />
    </Box>
  )
}