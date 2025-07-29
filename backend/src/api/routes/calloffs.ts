import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';
import shipmentLineRoutes from './shipment-lines';

const router = Router();

const createCallOffSchema = z.object({
  quota_id: z.string().uuid(),
  bundle_qty: z.number().int().min(1).max(10000),
  requested_delivery_date: z.string().datetime().optional(),
});

const updateCallOffSchema = z.object({
  bundle_qty: z.number().int().min(1).max(10000).optional(),
  requested_delivery_date: z.string().datetime().optional(),
});

const generateCallOffNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `CO-${year}-${timestamp}`;
};

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

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const data = createCallOffSchema.parse(req.body);
  
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
  
  const usedQty = await prisma.callOff.aggregate({
    where: {
      quota_id: data.quota_id,
      status: { notIn: ['CANCELLED'] as any },
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
  
  const callOff = await prisma.callOff.create({
    data: {
      call_off_number: generateCallOffNumber(),
      quota_id: data.quota_id,
      counterparty_id: quota.counterparty_id,
      direction: quota.direction,
      incoterm_code: quota.incoterm_code,
      bundle_qty: data.bundle_qty,
      requested_delivery_date: data.requested_delivery_date ? new Date(data.requested_delivery_date) : undefined,
      created_by: req.auth!.userId,
      status: 'NEW' as any,
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

router.patch('/:id', requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const data = updateCallOffSchema.parse(req.body);
  
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

router.post('/:id/confirm', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.update({
    where: {
      call_off_id: id,
      status: 'NEW' as any,
    },
    data: {
      status: 'CONFIRMED' as any,
      confirmed_at: new Date(),
    },
  });
  
  res.json({
    success: true,
    data: callOff,
  });
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.update({
    where: {
      call_off_id: id,
      status: { in: ['NEW', 'CONFIRMED'] as any },
    },
    data: {
      status: 'CANCELLED' as any,
      cancelled_at: new Date(),
    },
  });
  
  res.json({
    success: true,
    data: callOff,
  });
});

router.post('/:id/fulfill', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const callOff = await prisma.callOff.update({
    where: {
      call_off_id: id,
      status: 'CONFIRMED' as any,
    },
    data: {
      status: 'FULFILLED' as any,
      fulfilled_at: new Date(),
    },
  });
  
  res.json({
    success: true,
    data: callOff,
  });
});

router.use('/:callOffId/shipment-lines', shipmentLineRoutes);

export default router;