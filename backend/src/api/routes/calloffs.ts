import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';
import shipmentLineRoutes from './shipment-lines';

const router = Router();

// Validation schemas
const createCallOffSchema = z.object({
  quota_id: z.string().uuid(),
  bundle_qty: z.number().int().min(1).max(10000),
  requested_delivery_date: z.string().datetime().optional(),
  // delivery_address_id: z.string().uuid().optional(), // Field doesn't exist in imported DB
  delivery_location: z.string().optional(),
  fulfillment_location: z.string().optional(),
});

const updateCallOffSchema = z.object({
  bundle_qty: z.number().int().min(1).max(10000).optional(),
  requested_delivery_date: z.string().datetime().optional(),
  delivery_location: z.string().optional(),
  fulfillment_location: z.string().optional(),
  // delivery_address_id: z.string().uuid().optional(), // Field doesn't exist in imported DB
});

// Generate call-off number
const generateCallOffNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `CO-${year}-${timestamp}`;
};

// GET /api/call-offs - List call-offs
router.get('/', requireAuth, async (_req, res) => {
  const callOffs = await prisma.callOff.findMany({
    include: {
      quota: {
        include: {
          counterparty: true,
        },
      },
      counterparty: true,
      _count: {
        select: {
          shipment_lines: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 50,
  });
  
  res.json({
    success: true,
    data: callOffs,
    count: callOffs.length,
  });
});

// GET /api/call-offs/:id - Get single call-off
router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.findUnique({
    where: { call_off_id: id },
    include: {
      quota: {
        include: {
          counterparty: true,
        },
      },
      counterparty: true,
      // delivery_address: true, // Field doesn't exist in imported DB
      shipment_lines: {
        orderBy: { created_at: 'asc' },
      },
    },
  });
  
  if (!callOff) {
    res.status(404).json({
      success: false,
      error: 'Call-off not found',
    });
    return;
  }
  
  res.json({
    success: true,
    data: callOff,
  });
});

// POST /api/call-offs - Create call-off
router.post('/', requireAuth, async (req, res): Promise<void> => {
  const data = createCallOffSchema.parse(req.body);
  
  // Get quota details
  const quota = await prisma.quota.findUnique({
    where: { quota_id: data.quota_id },
    include: { counterparty: true },
  });
  
  if (!quota) {
    res.status(400).json({
      success: false,
      error: 'Invalid quota_id: Quota not found',
    });
    return;
  }
  
  // Check available quantity
  const usedQty = await prisma.callOff.aggregate({
    where: {
      quota_id: data.quota_id,
      status: { notIn: ['CANCELLED'] },
    },
    _sum: {
      bundle_qty: true,
    },
  });
  
  const availableQty = quota.qty_t - (usedQty._sum.bundle_qty || 0);
  
  if (data.bundle_qty > availableQty) {
    res.status(400).json({
      success: false,
      error: `Insufficient quota: only ${availableQty} bundles available`,
    });
    return;
  }
  
  // Create call-off
  const callOff = await prisma.callOff.create({
    data: {
      call_off_number: generateCallOffNumber(),
      quota_id: data.quota_id,
      counterparty_id: quota.counterparty_id,
      direction: quota.direction,
      incoterm_code: quota.incoterm_code,
      bundle_qty: data.bundle_qty,
      requested_delivery_date: data.requested_delivery_date ? new Date(data.requested_delivery_date) : undefined,
      // delivery_address_id: data.delivery_address_id, // Field doesn't exist in imported DB
      delivery_location: data.delivery_location,
      fulfillment_location: data.fulfillment_location,
      created_by: req.auth!.userId,
      status: 'NEW',
    },
    include: {
      quota: {
        include: {
          counterparty: true,
        },
      },
      counterparty: true,
    },
  });
  
  res.status(201).json({
    success: true,
    data: callOff,
  });
});

// PATCH /api/call-offs/:id - Update call-off
router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const data = updateCallOffSchema.parse(req.body);
  
  // Check if call-off exists and is editable
  const existing = await prisma.callOff.findUnique({
    where: { call_off_id: id },
  });
  
  if (!existing) {
    res.status(404).json({
      success: false,
      error: 'Call-off not found',
    });
    return;
  }
  
  if (existing.status !== 'NEW') {
    res.status(400).json({
      success: false,
      error: 'Only NEW call-offs can be edited',
    });
    return;
  }
  
  // Update call-off
  const updated = await prisma.callOff.update({
    where: { call_off_id: id },
    data: {
      ...data,
      requested_delivery_date: data.requested_delivery_date ? new Date(data.requested_delivery_date) : undefined,
    },
    include: {
      quota: {
        include: {
          counterparty: true,
        },
      },
      counterparty: true,
    },
  });
  
  res.json({
    success: true,
    data: updated,
  });
});

// POST /api/call-offs/:id/confirm - Confirm call-off
router.post('/:id/confirm', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.update({
    where: {
      call_off_id: id,
      status: 'NEW',
    },
    data: {
      status: 'CONFIRMED',
      confirmed_at: new Date(),
    },
  });
  
  res.json({
    success: true,
    data: callOff,
  });
});

// POST /api/call-offs/:id/cancel - Cancel call-off
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.update({
    where: {
      call_off_id: id,
      status: { in: ['NEW', 'CONFIRMED'] },
    },
    data: {
      status: 'CANCELLED',
      cancelled_at: new Date(),
    },
  });
  
  res.json({
    success: true,
    data: callOff,
  });
});

// POST /api/call-offs/:id/fulfill - Fulfill call-off
router.post('/:id/fulfill', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.update({
    where: {
      call_off_id: id,
      status: 'CONFIRMED',
    },
    data: {
      status: 'FULFILLED',
      fulfilled_at: new Date(),
    },
  });
  
  res.json({
    success: true,
    data: callOff,
  });
});

// Mount shipment line routes
router.use('/:callOffId/shipment-lines', shipmentLineRoutes);

export default router;