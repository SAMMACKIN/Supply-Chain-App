import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { QuotaSelector } from './QuotaSelector'
import { QuotaBalanceCard } from './QuotaBalanceCard'
import { createCallOffSchema, type CreateCallOffFormData } from '../../lib/validations'
import { fetchAvailableQuotas, fetchQuotaBalance, createCallOff } from '../../services/calloff-api'
import { useToast } from '../../hooks/useToast'
import type { CallOff } from '../../types/calloff'

interface CreateCallOffFormProps {
  onSuccess?: (callOff: CallOff) => void
  onCancel?: () => void
  initialQuotaId?: string
}

export function CreateCallOffForm({ 
  onSuccess, 
  onCancel, 
  initialQuotaId 
}: CreateCallOffFormProps) {
  const toast = useToast()
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateCallOffFormData>({
    resolver: zodResolver(createCallOffSchema),
    defaultValues: {
      quota_id: initialQuotaId || '',
      bundle_qty: 1,
      requested_delivery_date: ''
    }
  })

  // Watch quota_id to trigger balance checks
  const selectedQuotaId = watch('quota_id')
  const bundleQty = watch('bundle_qty')

  // Query available quotas
  const { data: quotas, isLoading: quotasLoading } = useQuery({
    queryKey: ['quotas'],
    queryFn: fetchAvailableQuotas,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Query quota balance when quota is selected
  const { data: quotaBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['quota-balance', selectedQuotaId],
    queryFn: () => fetchQuotaBalance(selectedQuotaId),
    enabled: !!selectedQuotaId,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Create call-off mutation
  const createCallOffMutation = useMutation({
    mutationFn: createCallOff,
    onSuccess: (data) => {
      toast.success('Call-off created successfully!')
      onSuccess?.(data)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create call-off')
    }
  })

  const onSubmit = (data: CreateCallOffFormData) => {
    createCallOffMutation.mutate(data)
  }

  const isQuotaInsufficient = quotaBalance && bundleQty > quotaBalance.remaining_qty_tonnes

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Create New Call-Off</h2>
        <p className="text-gray-600 mt-1">
          Create a call-off against an available quota to initiate the fulfillment process.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Quota Selection */}
        <QuotaSelector
          quotas={quotas}
          loading={quotasLoading}
          value={selectedQuotaId}
          onChange={(value) => setValue('quota_id', value)}
          error={errors.quota_id?.message}
        />

        {/* Quota Balance Display */}
        {quotaBalance && (
          <QuotaBalanceCard 
            balance={quotaBalance}
            requestedQty={bundleQty || 0}
          />
        )}

        {/* Bundle Quantity Input */}
        <div className="space-y-2">
          <Label htmlFor="bundle_qty">Bundle Quantity (tonnes) *</Label>
          <Input
            id="bundle_qty"
            type="number"
            min="1"
            max="10000"
            {...register('bundle_qty', { valueAsNumber: true })}
            placeholder="Enter number of bundles"
          />
          {errors.bundle_qty && (
            <p className="text-red-600 text-sm">{errors.bundle_qty.message}</p>
          )}
          {isQuotaInsufficient && (
            <p className="text-red-600 text-sm">
              Insufficient quota balance. Available: {quotaBalance?.remaining_qty_tonnes} tonnes
            </p>
          )}
        </div>

        {/* Delivery Date (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="requested_delivery_date">Requested Delivery Date (Optional)</Label>
          <Input
            id="requested_delivery_date"
            type="date"
            {...register('requested_delivery_date')}
            min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
          />
          {errors.requested_delivery_date && (
            <p className="text-red-600 text-sm">{errors.requested_delivery_date.message}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={
              isSubmitting || 
              !selectedQuotaId || 
              isQuotaInsufficient ||
              balanceLoading
            }
            className="flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Create Call-Off'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}