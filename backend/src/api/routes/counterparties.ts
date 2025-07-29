import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const counterpartyFilterSchema = z.object({
  is_active: z.boolean().optional(),
  search: z.string().optional(),
});

// GET /api/counterparties - List all counterparties
router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = counterpartyFilterSchema.parse(req.query);
    
    const where: any = {};
    
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    
    if (filters.search) {
      where.OR = [
        { company_name: { contains: filters.search, mode: 'insensitive' } },
        { company_code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    const counterparties = await prisma.counterparty.findMany({
      where,
      include: {
        _count: {
          select: {
            quotas: true,
            call_offs: true,
          },
        },
      },
      orderBy: {
        company_name: 'asc',
      },
    });
    
    res.json({
      success: true,
      data: counterparties,
      count: counterparties.length,
    });
  } catch (error) {
    console.error('Error fetching counterparties:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch counterparties',
    });
  }
});

// GET /api/counterparties/:id - Get single counterparty
router.get('/:id', requireAuth, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    const counterparty = await prisma.counterparty.findUnique({
      where: { counterparty_id: id },
      include: {
        quotas: {
          where: { is_active: true },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        call_offs: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!counterparty) {
      res.status(404).json({
        success: false,
        error: 'Counterparty not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: counterparty,
    });
  } catch (error) {
    console.error('Error fetching counterparty:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch counterparty',
    });
  }
});

export default router;