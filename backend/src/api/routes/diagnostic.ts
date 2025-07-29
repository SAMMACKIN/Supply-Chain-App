import { Router } from 'express';
import { prisma } from '../../db/client';

const router = Router();

// GET /api/diagnostic/schema - Check database schema
router.get('/schema', async (_req, res) => {
  try {
    // Get table information
    const tables = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('quota', 'call_off', 'counterparty')
      ORDER BY table_name, ordinal_position
    `;
    
    res.json({
      success: true,
      tables,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/diagnostic/test-queries - Test basic queries
router.get('/test-queries', async (_req, res) => {
  try {
    const results: any = {};
    
    // Test quota query without month filter
    try {
      const quotaCount = await prisma.$queryRaw`SELECT COUNT(*) FROM quota`;
      results.quotaCount = quotaCount;
    } catch (e) {
      results.quotaCount = { error: (e as Error).message };
    }
    
    // Test call_off query
    try {
      const callOffCount = await prisma.$queryRaw`SELECT COUNT(*) FROM call_off`;
      results.callOffCount = callOffCount;
    } catch (e) {
      results.callOffCount = { error: (e as Error).message };
    }
    
    // Test counterparty query
    try {
      const counterpartyCount = await prisma.$queryRaw`SELECT COUNT(*) FROM counterparty`;
      results.counterpartyCount = counterpartyCount;
    } catch (e) {
      results.counterpartyCount = { error: (e as Error).message };
    }
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;