import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const quotaFilterSchema = z.object({
  direction: z.enum(['BUY', 'SELL']).optional(),
  month: z.string().optional(),
  metal_code: z.string().optional(),
  counterparty_id: z.string().uuid().optional(),
  business_unit: z.string().optional(),
});

// GET /api/quotas - List all quotas with filters
router.get('/', requireAuth, async (req, res) => {
  const filters = quotaFilterSchema.parse(req.query);
  
  const where: any = {};
  
  if (filters.direction) where.direction = filters.direction;
  if (filters.metal_code) where.metal_code = filters.metal_code;
  if (filters.counterparty_id) where.counterparty_id = filters.counterparty_id;
  if (filters.business_unit) where.business_unit_id = filters.business_unit;
  if (filters.month) {
    const monthDate = new Date(filters.month);
    where.period_month = monthDate;
  }
  
  const quotas = await prisma.quota.findMany({
    where,
    include: {
      counterparty: {
        select: {
          company_name: true,
          company_code: true,
        },
      },
      _count: {
        select: {
          call_offs: true,
        },
      },
    },
    orderBy: [
      { period_month: 'desc' },
      { metal_code: 'asc' },
    ],
  });
  
  // Calculate used quantities
  const quotasWithBalance = await Promise.all(
    quotas.map(async (quota) => {
      const usedQty = await prisma.callOff.aggregate({
        where: {
          quota_id: quota.quota_id,
          status: { notIn: ['CANCELLED'] },
        },
        _sum: {
          bundle_qty: true,
        },
      });
      
      return {
        ...quota,
        used_qty: usedQty._sum.bundle_qty || 0,
        available_qty: quota.qty_t - (usedQty._sum.bundle_qty || 0),
        // Map qty_t to bundle_qty for frontend compatibility
        bundle_qty: quota.qty_t,
      };
    })
  );
  
  res.json({
    success: true,
    data: quotasWithBalance,
    count: quotasWithBalance.length,
  });
});

// GET /api/quotas/:id - Get single quota
router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  
  const quota = await prisma.quota.findUnique({
    where: { quota_id: id },
    include: {
      counterparty: true,
      call_offs: {
        orderBy: { created_at: 'desc' },
        take: 10,
      },
    },
  });
  
  if (!quota) {
    res.status(404).json({
      success: false,
      error: 'Quota not found',
    });
    return;
  }
  
  res.json({
    success: true,
    data: quota,
  });
});

// GET /api/quotas/counterparties - List unique counterparties
router.get('/filters/counterparties', requireAuth, async (_req, res) => {
  const counterparties = await prisma.counterparty.findMany({
    where: {
      is_active: true,
      quotas: {
        some: {}, // Just check if any quotas exist
      },
    },
    select: {
      counterparty_id: true,
      company_name: true,
      company_code: true,
    },
    orderBy: {
      company_name: 'asc',
    },
  });
  
  res.json({
    success: true,
    data: counterparties,
  });
});

export default router;