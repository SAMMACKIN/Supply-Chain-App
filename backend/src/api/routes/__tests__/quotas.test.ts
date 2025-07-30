import request from 'supertest';
import express from 'express';
import 'express-async-errors'; // Import this before routes
import quotasRouter from '../quotas';
import { prisma } from '../../../db/client';
import { ZodError } from 'zod';

// Mock Prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    quota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    callOff: {
      aggregate: jest.fn(),
    },
    counterparty: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  requireAuth: jest.fn((req: any, _res: any, next: any) => {
    req.auth = {
      userId: 'test-user-123',
      sessionId: 'test-session-123',
    };
    next();
  }),
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/quotas', quotasRouter);

// Add error handler middleware
app.use((err: any, _req: any, res: any, _next: any) => {
  // Simplified error handler for tests
  if (err instanceof ZodError || err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Invalid input',
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Sample test data
const mockQuota = {
  quota_id: '123e4567-e89b-12d3-a456-426614174000',
  direction: 'BUY',
  metal_code: 'ALU',
  counterparty_id: '223e4567-e89b-12d3-a456-426614174000',
  business_unit_id: 'BU001',
  period_month: new Date('2025-01-01'),
  qty_t: 1000,
  price: 2500,
  currency: 'USD',
  created_at: new Date('2025-01-01T10:00:00Z'),
  updated_at: new Date('2025-01-01T10:00:00Z'),
};

const mockCounterparty = {
  counterparty_id: '223e4567-e89b-12d3-a456-426614174000',
  company_name: 'Test Company Ltd',
  company_code: 'TC001',
  is_active: true,
};

const mockCallOffAggregate = {
  _sum: {
    bundle_qty: 250,
  },
};

describe('Quotas API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/quotas', () => {
    it('should return all quotas with balance calculations', async () => {
      // Mock Prisma responses
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockQuota,
          counterparty: {
            company_name: mockCounterparty.company_name,
            company_code: mockCounterparty.company_code,
          },
          _count: {
            call_offs: 5,
          },
        },
      ]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue(mockCallOffAggregate);

      const response = await request(app)
        .get('/api/quotas')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [
          {
            ...mockQuota,
            counterparty: {
              company_name: mockCounterparty.company_name,
              company_code: mockCounterparty.company_code,
            },
            _count: {
              call_offs: 5,
            },
            // Date objects are serialized to strings in JSON
            created_at: mockQuota.created_at.toISOString(),
            updated_at: mockQuota.updated_at.toISOString(),
            period_month: mockQuota.period_month.toISOString(),
            used_qty: 250,
            available_qty: 750,
            bundle_qty: 1000, // Maps qty_t to bundle_qty
          },
        ],
        count: 1,
      });

      expect(prisma.quota.findMany).toHaveBeenCalledWith({
        where: {},
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
    });

    it('should filter quotas by direction', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      await request(app)
        .get('/api/quotas?direction=SELL')
        .expect(200);

      expect(prisma.quota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { direction: 'SELL' },
        })
      );
    });

    it('should filter quotas by metal_code', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      await request(app)
        .get('/api/quotas?metal_code=COP')
        .expect(200);

      expect(prisma.quota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { metal_code: 'COP' },
        })
      );
    });

    it('should filter quotas by counterparty_id', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      const counterpartyId = '323e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/api/quotas?counterparty_id=${counterpartyId}`)
        .expect(200);

      expect(prisma.quota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { counterparty_id: counterpartyId },
        })
      );
    });

    it('should filter quotas by business_unit', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      await request(app)
        .get('/api/quotas?business_unit=BU002')
        .expect(200);

      expect(prisma.quota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { business_unit_id: 'BU002' },
        })
      );
    });

    it('should filter quotas by month', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      await request(app)
        .get('/api/quotas?month=2025-02')
        .expect(200);

      expect(prisma.quota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { period_month: new Date('2025-02') },
        })
      );
    });

    it('should handle multiple filters', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      await request(app)
        .get('/api/quotas?direction=BUY&metal_code=ALU&month=2025-01')
        .expect(200);

      expect(prisma.quota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            direction: 'BUY',
            metal_code: 'ALU',
            period_month: new Date('2025-01'),
          },
        })
      );
    });

    it('should handle quotas with no call-offs', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockQuota,
          counterparty: {
            company_name: mockCounterparty.company_name,
            company_code: mockCounterparty.company_code,
          },
          _count: {
            call_offs: 0,
          },
        },
      ]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: null } });

      const response = await request(app)
        .get('/api/quotas')
        .expect(200);

      expect(response.body.data[0]).toMatchObject({
        used_qty: 0,
        available_qty: 1000,
        bundle_qty: 1000,
      });
    });

    it('should return 400 for invalid direction filter', async () => {
      const response = await request(app)
        .get('/api/quotas?direction=INVALID')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid'),
      });
    });

    it('should return 400 for invalid UUID in counterparty_id', async () => {
      const response = await request(app)
        .get('/api/quotas?counterparty_id=not-a-uuid')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid'),
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.quota.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/quotas')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('GET /api/quotas/:id', () => {
    it('should return a single quota with details', async () => {
      const mockQuotaWithDetails = {
        ...mockQuota,
        counterparty: mockCounterparty,
        call_offs: [
          {
            call_off_id: '423e4567-e89b-12d3-a456-426614174000',
            bundle_qty: 100,
            status: 'ACTIVE',
            created_at: new Date('2025-01-05T10:00:00Z'),
          },
        ],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaWithDetails);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockQuotaWithDetails,
          // Date objects are serialized to strings in JSON
          created_at: mockQuotaWithDetails.created_at.toISOString(),
          updated_at: mockQuotaWithDetails.updated_at.toISOString(),
          period_month: mockQuotaWithDetails.period_month.toISOString(),
          counterparty: {
            ...mockQuotaWithDetails.counterparty,
          },
          call_offs: mockQuotaWithDetails.call_offs.map(co => ({
            ...co,
            created_at: co.created_at.toISOString(),
          })),
        },
      });

      expect(prisma.quota.findUnique).toHaveBeenCalledWith({
        where: { quota_id: mockQuota.quota_id },
        include: {
          counterparty: true,
          call_offs: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
        },
      });
    });

    it('should return 404 for non-existent quota', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(null);

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/quotas/${nonExistentId}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Quota not found',
      });
    });

    it('should handle database errors when fetching single quota', async () => {
      (prisma.quota.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('GET /api/quotas/filters/counterparties', () => {
    it('should return active counterparties with quotas', async () => {
      const mockCounterparties = [
        {
          counterparty_id: '223e4567-e89b-12d3-a456-426614174000',
          company_name: 'Alpha Company',
          company_code: 'ALPHA',
        },
        {
          counterparty_id: '323e4567-e89b-12d3-a456-426614174000',
          company_name: 'Beta Corporation',
          company_code: 'BETA',
        },
      ];

      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue(mockCounterparties);

      const response = await request(app)
        .get('/api/quotas/filters/counterparties')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockCounterparties,
      });

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
          quotas: {
            some: {},
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
    });

    it('should return empty array when no counterparties have quotas', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/quotas/filters/counterparties')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle database errors when fetching counterparties', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/quotas/filters/counterparties')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('Authentication', () => {
    it('should include auth information in request', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);
      
      await request(app)
        .get('/api/quotas')
        .expect(200);

      // Auth middleware should have been called
      const authMock = jest.requireMock('../../middleware/auth') as any;
      expect(authMock.requireAuth).toHaveBeenCalled();
    });
  });

  describe('GET /api/quotas/:id/balance', () => {
    it('should return balance details for a quota', async () => {
      const mockQuotaWithCallOffs = {
        ...mockQuota,
        tolerance_pct: 10,
        counterparty: mockCounterparty,
        call_offs: [
          {
            call_off_id: '423e4567-e89b-12d3-a456-426614174000',
            bundle_qty: 200,
            status: 'CONFIRMED',
          },
          {
            call_off_id: '523e4567-e89b-12d3-a456-426614174000',
            bundle_qty: 150,
            status: 'ACTIVE',
          },
        ],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaWithCallOffs);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          quota_id: mockQuota.quota_id,
          quota_qty_tonnes: 1000,
          consumed_bundles: 350,
          pending_bundles: 0,
          remaining_qty_tonnes: 650,
          tolerance_pct: 10,
          utilization_pct: 35,
          tolerance_status: 'WITHIN_LIMITS',
          call_off_count: 2,
        },
      });

      expect(prisma.quota.findUnique).toHaveBeenCalledWith({
        where: { quota_id: mockQuota.quota_id },
        include: {
          counterparty: true,
          call_offs: {
            where: {
              status: { not: 'CANCELLED' },
            },
          },
        },
      });
    });

    it('should handle quota with no tolerance', async () => {
      const mockQuotaNoTolerance = {
        ...mockQuota,
        tolerance_pct: null,
        counterparty: mockCounterparty,
        call_offs: [],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaNoTolerance);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        tolerance_pct: 0,
        consumed_bundles: 0,
        tolerance_status: 'WITHIN_LIMITS',
      });
    });

    it('should detect OVER_QUOTA status when consumed exceeds quota', async () => {
      const mockQuotaOverused = {
        ...mockQuota,
        qty_t: 500,
        tolerance_pct: 10, // 10% = 50 tonnes
        counterparty: mockCounterparty,
        call_offs: [
          { bundle_qty: 520, status: 'ACTIVE' }, // 20 over quota, within tolerance
        ],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaOverused);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        quota_qty_tonnes: 500,
        consumed_bundles: 520,
        remaining_qty_tonnes: -20,
        tolerance_status: 'OVER_QUOTA',
      });
    });

    it('should detect OVER_TOLERANCE status when consumed exceeds quota + tolerance', async () => {
      const mockQuotaOverTolerance = {
        ...mockQuota,
        qty_t: 500,
        tolerance_pct: 10, // 10% = 50 tonnes
        counterparty: mockCounterparty,
        call_offs: [
          { bundle_qty: 560, status: 'ACTIVE' }, // 60 over quota, exceeds tolerance
        ],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaOverTolerance);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        quota_qty_tonnes: 500,
        consumed_bundles: 560,
        remaining_qty_tonnes: -60,
        tolerance_status: 'OVER_TOLERANCE',
      });
    });

    it('should return 404 for non-existent quota', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Quota not found',
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.quota.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should exclude cancelled call-offs from balance calculations', async () => {
      // The API filters out cancelled call-offs before returning them
      const mockQuotaWithNonCancelledCallOffs = {
        ...mockQuota,
        counterparty: mockCounterparty,
        call_offs: [
          { bundle_qty: 200, status: 'CONFIRMED' },
          { bundle_qty: 150, status: 'ACTIVE' },
          // Cancelled call-offs are not included in the result
        ],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaWithNonCancelledCallOffs);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(200);

      // Only non-cancelled call-offs should be counted
      expect(response.body.data.consumed_bundles).toBe(350);
      expect(response.body.data.call_off_count).toBe(2); // Only non-cancelled call-offs
    });

    it('should handle high precision utilization percentages', async () => {
      const mockQuotaPrecision = {
        ...mockQuota,
        qty_t: 333,
        counterparty: mockCounterparty,
        call_offs: [
          { bundle_qty: 111, status: 'ACTIVE' }, // 33.333...%
        ],
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuotaPrecision);

      const response = await request(app)
        .get(`/api/quotas/${mockQuota.quota_id}/balance`)
        .expect(200);

      expect(response.body.data.utilization_pct).toBe(33.33); // Rounded to 2 decimal places
    });
  });

  describe('Edge Cases', () => {
    it('should handle quotas with very large quantities', async () => {
      const largeQuota = {
        ...mockQuota,
        qty_t: 999999999,
        counterparty: {
          company_name: mockCounterparty.company_name,
          company_code: mockCounterparty.company_code,
        },
        _count: { call_offs: 0 },
      };

      (prisma.quota.findMany as jest.Mock).mockResolvedValue([largeQuota]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: 500000000 } });

      const response = await request(app)
        .get('/api/quotas')
        .expect(200);

      expect(response.body.data[0]).toMatchObject({
        used_qty: 500000000,
        available_qty: 499999999,
        bundle_qty: 999999999,
      });
    });

    it('should handle quotas where used quantity exceeds total quantity', async () => {
      const overusedQuota = {
        ...mockQuota,
        qty_t: 500,
        counterparty: {
          company_name: mockCounterparty.company_name,
          company_code: mockCounterparty.company_code,
        },
        _count: { call_offs: 10 },
      };

      (prisma.quota.findMany as jest.Mock).mockResolvedValue([overusedQuota]);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({ _sum: { bundle_qty: 600 } });

      const response = await request(app)
        .get('/api/quotas')
        .expect(200);

      expect(response.body.data[0]).toMatchObject({
        used_qty: 600,
        available_qty: -100, // Negative available quantity
        bundle_qty: 500,
      });
    });

    it('should handle empty result sets gracefully', async () => {
      (prisma.quota.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/quotas?direction=SELL&metal_code=GOLD')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });
  });
});