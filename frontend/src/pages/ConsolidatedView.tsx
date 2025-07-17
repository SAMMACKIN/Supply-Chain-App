import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Assignment as QuotaIcon,
  LocalShipping as CallOffIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { fetchCounterparties, fetchQuotasByCounterparty, fetchCallOffs } from '../services/calloff-api'
import { CreateCallOffWizard } from '../components/CallOff/CreateCallOffWizard'
import { CallOffDetailView } from '../components/CallOff/CallOffDetailView'
import type { Counterparty, Quota, CallOff } from '../types/calloff'

export function ConsolidatedView() {
  const [searchText, setSearchText] = useState('')
  const [expandedCounterparty, setExpandedCounterparty] = useState<string | false>(false)
  const [expandedQuota, setExpandedQuota] = useState<string | false>(false)
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null)
  const [selectedCallOff, setSelectedCallOff] = useState<CallOff | null>(null)
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showCallOffDetail, setShowCallOffDetail] = useState(false)

  // Fetch all data
  const { data: counterparties, isLoading: loadingCounterparties } = useQuery({
    queryKey: ['counterparties'],
    queryFn: fetchCounterparties,
  })

  const { data: allCallOffs, isLoading: loadingCallOffs } = useQuery({
    queryKey: ['call-offs'],
    queryFn: fetchCallOffs,
  })

  // Fetch quotas for expanded counterparty
  const { data: quotas } = useQuery({
    queryKey: ['quotas', expandedCounterparty],
    queryFn: () => fetchQuotasByCounterparty(expandedCounterparty as string),
    enabled: !!expandedCounterparty,
  })

  const handleCounterpartyChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCounterparty(isExpanded ? panel : false)
    setExpandedQuota(false) // Close quota when changing counterparty
  }

  const handleQuotaChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedQuota(isExpanded ? panel : false)
  }

  const getCallOffsForQuota = (quotaId: string) => {
    return allCallOffs?.filter(co => co.quota_id === quotaId) || []
  }

  const getTotalTonnageForCounterparty = (counterpartyId: string) => {
    if (!quotas) return 0
    return quotas.reduce((total, quota) => total + quota.qty_t, 0)
  }

  const getUtilizedTonnageForCounterparty = (counterpartyId: string) => {
    if (!quotas || !allCallOffs) return 0
    const quotaIds = quotas.map(q => q.quota_id)
    const relevantCallOffs = allCallOffs.filter(co => 
      quotaIds.includes(co.quota_id) && 
      ['CONFIRMED', 'FULFILLED'].includes(co.status)
    )
    return relevantCallOffs.reduce((total, co) => total + co.bundle_qty, 0)
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

  const filteredCounterparties = counterparties?.filter(cp => 
    searchText === '' ||
    cp.company_name.toLowerCase().includes(searchText.toLowerCase()) ||
    cp.company_code.toLowerCase().includes(searchText.toLowerCase())
  )

  if (loadingCounterparties || loadingCallOffs) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading data...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BusinessIcon />
        Consolidated View
      </Typography>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by company name or code..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Nested Accordions */}
      {filteredCounterparties?.map((counterparty) => (
        <Accordion
          key={counterparty.counterparty_id}
          expanded={expandedCounterparty === counterparty.counterparty_id}
          onChange={handleCounterpartyChange(counterparty.counterparty_id)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <BusinessIcon color="primary" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{counterparty.company_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {counterparty.company_code} • {counterparty.country_code}
                </Typography>
              </Box>
              {expandedCounterparty === counterparty.counterparty_id && quotas && (
                <Box sx={{ textAlign: 'right', mr: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total: {getTotalTonnageForCounterparty(counterparty.counterparty_id).toLocaleString()}t
                  </Typography>
                  <Typography variant="body2" color="primary">
                    Used: {getUtilizedTonnageForCounterparty(counterparty.counterparty_id).toLocaleString()}t
                  </Typography>
                </Box>
              )}
              <Chip
                label={counterparty.counterparty_type}
                size="small"
                color={counterparty.counterparty_type === 'CUSTOMER' ? 'primary' : 'secondary'}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {quotas?.map((quota) => (
              <Accordion
                key={quota.quota_id}
                expanded={expandedQuota === quota.quota_id}
                onChange={handleQuotaChange(quota.quota_id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <QuotaIcon color="secondary" />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography>
                        {quota.metal_code} - {quota.qty_t} tonnes
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(quota.period_month), 'MMM yyyy')} • {quota.incoterm_code}
                      </Typography>
                    </Box>
                    <Chip
                      label={quota.direction}
                      size="small"
                      color={getDirectionColor(quota.direction) as any}
                    />
                    <Tooltip title="Create Call-Off">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedQuota(quota)
                          setShowCreateWizard(true)
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Call-Off Number</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Bundle Qty</TableCell>
                          <TableCell>Delivery Date</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getCallOffsForQuota(quota.quota_id).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No call-offs for this quota
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          getCallOffsForQuota(quota.quota_id).map((callOff) => (
                            <TableRow key={callOff.call_off_id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CallOffIcon fontSize="small" color="action" />
                                  <Typography variant="body2">{callOff.call_off_number}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={callOff.status}
                                  size="small"
                                  color={getStatusColor(callOff.status) as any}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{callOff.bundle_qty}t</TableCell>
                              <TableCell>
                                {callOff.requested_delivery_date
                                  ? format(new Date(callOff.requested_delivery_date), 'MMM dd, yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {format(new Date(callOff.created_at), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedCallOff(callOff)
                                      setShowCallOffDetail(true)
                                    }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
            {(!quotas || quotas.length === 0) && (
              <Alert severity="info">No quotas found for this counterparty</Alert>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Create Call-Off Wizard */}
      <CreateCallOffWizard
        open={showCreateWizard}
        onClose={() => {
          setShowCreateWizard(false)
          setSelectedQuota(null)
        }}
        onSuccess={(callOff) => {
          setShowCreateWizard(false)
          setSelectedCallOff(callOff)
          setShowCallOffDetail(true)
        }}
        initialQuota={selectedQuota || undefined}
      />

      {/* Call-Off Detail View */}
      {selectedCallOff && (
        <CallOffDetailView
          callOff={selectedCallOff}
          open={showCallOffDetail}
          onClose={() => {
            setShowCallOffDetail(false)
            setSelectedCallOff(null)
          }}
        />
      )}
    </Box>
  )
}