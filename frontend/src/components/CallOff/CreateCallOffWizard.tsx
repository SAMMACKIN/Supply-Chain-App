import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material'
import { useToast } from '../../hooks/useToast'
import { fetchCounterparties, fetchQuotasByCounterparty, createCallOff } from '../../services/calloff-api'
import type { Counterparty, Quota, CreateCallOffRequest } from '../../types/calloff'

const callOffSchema = z.object({
  counterparty_id: z.string().min(1, 'Please select a counterparty'),
  quota_id: z.string().min(1, 'Please select a quota'),
  bundle_qty: z.number().min(1, 'Bundle quantity must be at least 1'),
  requested_delivery_date: z.string().optional()
})

type CallOffFormData = z.infer<typeof callOffSchema>

interface CreateCallOffWizardProps {
  open: boolean
  onClose: () => void
  initialCounterpartyId?: string // For future email integration
  initialQuota?: Quota // When creating from quota page
}

const steps = ['Select Counterparty', 'Choose Quota', 'Call-Off Details']

export function CreateCallOffWizard({ open, onClose, initialCounterpartyId, initialQuota }: CreateCallOffWizardProps) {
  const [activeStep, setActiveStep] = useState(initialQuota ? 2 : 0)
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null)
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(initialQuota || null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CallOffFormData>({
    resolver: zodResolver(callOffSchema),
    defaultValues: {
      counterparty_id: initialCounterpartyId || initialQuota?.counterparty_id || '',
      quota_id: initialQuota?.quota_id || '',
      bundle_qty: 1,
      requested_delivery_date: ''
    }
  })

  const counterpartyId = watch('counterparty_id')
  const quotaId = watch('quota_id')

  // Fetch counterparties
  const { data: counterparties, isLoading: loadingCounterparties } = useQuery({
    queryKey: ['counterparties'],
    queryFn: fetchCounterparties
  })

  // Fetch quotas for selected counterparty
  const { data: quotas, isLoading: loadingQuotas } = useQuery({
    queryKey: ['quotas', counterpartyId],
    queryFn: () => fetchQuotasByCounterparty(counterpartyId),
    enabled: !!counterpartyId
  })

  // Create call-off mutation
  const createMutation = useMutation({
    mutationFn: createCallOff,
    onSuccess: () => {
      toast.success('Call-off created successfully!')
      queryClient.invalidateQueries({ queryKey: ['call-offs'] })
      handleClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to create call-off: ${error.message}`)
    }
  })

  // Handle initial quota setup
  useEffect(() => {
    if (initialQuota && open) {
      setSelectedQuota(initialQuota)
      setValue('quota_id', initialQuota.quota_id)
      setValue('counterparty_id', initialQuota.counterparty_id)
      
      // Find and set the counterparty
      const counterparty = counterparties?.find(cp => cp.counterparty_id === initialQuota.counterparty_id)
      if (counterparty) {
        setSelectedCounterparty(counterparty)
      }
      
      setActiveStep(2) // Jump to call-off details
    }
  }, [initialQuota, open, counterparties, setValue])

  const handleClose = () => {
    setActiveStep(initialQuota ? 2 : 0)
    setSelectedCounterparty(null)
    setSelectedQuota(initialQuota || null)
    reset()
    onClose()
  }

  const handleNext = () => {
    if (activeStep === 0) {
      const counterparty = counterparties?.find(cp => cp.counterparty_id === counterpartyId)
      setSelectedCounterparty(counterparty || null)
    } else if (activeStep === 1) {
      const quota = quotas?.find(q => q.quota_id === quotaId)
      setSelectedQuota(quota || null)
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const onSubmit = (data: CallOffFormData) => {
    const requestData: CreateCallOffRequest = {
      quota_id: data.quota_id,
      bundle_qty: data.bundle_qty,
      requested_delivery_date: data.requested_delivery_date || undefined
    }
    createMutation.mutate(requestData)
  }

  const canProceed = () => {
    switch (activeStep) {
      case 0: return !!counterpartyId
      case 1: return !!quotaId
      case 2: return true
      default: return false
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ minHeight: 300 }}>
            <Typography variant="h6" gutterBottom>
              Select Trading Partner
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose the counterparty for this call-off. You'll then see their available quotas.
            </Typography>

            {loadingCounterparties ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Controller
                name="counterparty_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.counterparty_id}>
                    <InputLabel>Counterparty</InputLabel>
                    <Select
                      {...field}
                      label="Counterparty"
                      data-testid="counterparty-select"
                      MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                    >
                      {counterparties?.map((counterparty) => (
                        <MenuItem key={counterparty.counterparty_id} value={counterparty.counterparty_id}>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {counterparty.company_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {counterparty.company_code} • {counterparty.country_code} • {counterparty.counterparty_type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.counterparty_id && (
                      <FormHelperText>{errors.counterparty_id.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            )}
          </Box>
        )

      case 1:
        return (
          <Box sx={{ minHeight: 300 }}>
            <Typography variant="h6" gutterBottom>
              Choose Quota
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select from {selectedCounterparty?.company_name}'s available quotas
            </Typography>

            {selectedCounterparty && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="subtitle2" color="primary">
                    {selectedCounterparty.company_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedCounterparty.company_code} • {selectedCounterparty.country_code}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {loadingQuotas ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : quotas && quotas.length > 0 ? (
              <Controller
                name="quota_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.quota_id}>
                    <InputLabel>Available Quotas</InputLabel>
                    <Select
                      {...field}
                      label="Available Quotas"
                      data-testid="quota-select"
                      MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
                    >
                      {quotas.map((quota) => (
                        <MenuItem key={quota.quota_id} value={quota.quota_id}>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body1">
                                {quota.qty_t}t {quota.metal_code} - {quota.direction}
                              </Typography>
                              <Chip 
                                label={quota.direction} 
                                color={quota.direction === 'BUY' ? 'success' : 'warning'} 
                                size="small" 
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {quota.incoterm_code} • {quota.period_month} • ±{quota.tolerance_pct}%
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.quota_id && (
                      <FormHelperText>{errors.quota_id.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            ) : (
              <Alert severity="info">
                No quotas available for {selectedCounterparty?.company_name}
              </Alert>
            )}
          </Box>
        )

      case 2:
        return (
          <Box sx={{ minHeight: 300 }}>
            <Typography variant="h6" gutterBottom>
              Call-Off Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter the specific details for this call-off
            </Typography>

            {/* Selected summary */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Selected Quote
                </Typography>
                <Typography variant="body2">
                  <strong>{selectedCounterparty?.company_name}</strong> • {selectedQuota?.qty_t}t {selectedQuota?.metal_code} • {selectedQuota?.direction}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedQuota?.incoterm_code} • {selectedQuota?.period_month}
                </Typography>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Controller
                name="bundle_qty"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Bundle Quantity"
                    data-testid="bundle-qty-input"
                    error={!!errors.bundle_qty}
                    helperText={errors.bundle_qty?.message || 'Number of 1-tonne bundles to call off'}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    inputProps={{ min: 1, max: selectedQuota?.qty_t || 1000 }}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="requested_delivery_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Requested Delivery Date"
                    data-testid="requested-delivery-date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.requested_delivery_date}
                    helperText={errors.requested_delivery_date?.message || 'Optional: preferred delivery date'}
                    fullWidth
                  />
                )}
              />
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Create New Call-Off
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent()}
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          data-testid="wizard-back-button"
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || createMutation.isPending}
            data-testid="create-call-off-submit"
          >
            {isSubmitting || createMutation.isPending ? <CircularProgress size={20} /> : 'Create Call-Off'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed()}
            data-testid="wizard-next-button"
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}