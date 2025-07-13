import { z } from 'zod'

export const createCallOffSchema = z.object({
  quota_id: z.string().uuid('Please select a valid quota'),
  bundle_qty: z.number()
    .min(1, 'Bundle quantity must be at least 1')
    .max(10000, 'Bundle quantity cannot exceed 10,000')
    .int('Bundle quantity must be a whole number'),
  requested_delivery_date: z.string().optional()
    .refine((date) => {
      if (!date) return true
      return new Date(date) > new Date()
    }, 'Delivery date must be in the future')
})

export type CreateCallOffFormData = z.infer<typeof createCallOffSchema>