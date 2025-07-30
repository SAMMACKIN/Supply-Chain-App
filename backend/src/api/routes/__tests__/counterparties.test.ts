import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import counterpartiesRouter from '../counterparties';
import { prisma } from '../../../db/client';

// Mock Prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    counterparty: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
app.use('/api/counterparties', counterpartiesRouter);

// Add error handler middleware
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Sample test data
const mockCounterparty = {
  counterparty_id: '123e4567-e89b-12d3-a456-426614174000',
  company_name: 'Alpha Metals Ltd',
  company_code: 'AML001',
  is_active: true,
  created_at: new Date('2025-01-01T10:00:00Z'),
  updated_at: new Date('2025-01-01T10:00:00Z'),
};

const mockCounterpartyWithRelations = {
  ...mockCounterparty,
  quotas: [
    {
      quota_id: '223e4567-e89b-12d3-a456-426614174000',
      metal_code: 'ALU',
      qty_t: 1000,
      period_month: new Date('2025-01-01'),
    },
    {
      quota_id: '323e4567-e89b-12d3-a456-426614174000',
      metal_code: 'COP',
      qty_t: 500,
      period_month: new Date('2025-02-01'),
    },
  ],
  call_offs: [
    {
      call_off_id: '423e4567-e89b-12d3-a456-426614174000',
      call_off_no: 'CO-2025-0001',
      bundle_qty: 100,
      status: 'CONFIRMED',
    },
  ],
};

describe('Counterparties API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/counterparties', () => {
    it('should return all counterparties with counts', async () => {
      const mockCounterparties = [
        {
          ...mockCounterparty,
          _count: {
            quotas: 5,
            call_offs: 12,
          },
        },
        {
          counterparty_id: '223e4567-e89b-12d3-a456-426614174000',
          company_name: 'Beta Trading Co',
          company_code: 'BTC002',
          is_active: true,
          created_at: new Date('2025-01-02T10:00:00Z'),
          updated_at: new Date('2025-01-02T10:00:00Z'),
          _count: {
            quotas: 3,
            call_offs: 8,
          },
        },
      ];

      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue(mockCounterparties);

      const response = await request(app)
        .get('/api/counterparties')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockCounterparties.map(cp => ({
          ...cp,
          created_at: cp.created_at.toISOString(),
          updated_at: cp.updated_at.toISOString(),
        })),
        count: 2,
      });

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith({
        where: {},
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
    });

    it('should filter by is_active status', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/counterparties?is_active=true')
        .expect(200);

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_active: true },
        })
      );

      // Test with false
      await request(app)
        .get('/api/counterparties?is_active=false')
        .expect(200);

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_active: false },
        })
      );
    });

    it('should search by company name or code', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([mockCounterparty]);

      await request(app)
        .get('/api/counterparties?search=Alpha')
        .expect(200);

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { company_name: { contains: 'Alpha', mode: 'insensitive' } },
              { company_code: { contains: 'Alpha', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should handle combined filters', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/counterparties?is_active=true&search=Metal')
        .expect(200);

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_active: true,
            OR: [
              { company_name: { contains: 'Metal', mode: 'insensitive' } },
              { company_code: { contains: 'Metal', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should handle empty search string', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/counterparties?search=')
        .expect(200);

      expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/counterparties')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection failed',
      });
    });

    it('should handle invalid boolean values for is_active', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      // Invalid boolean should be ignored
      await request(app)
        .get('/api/counterparties?is_active=invalid')
        .expect(200);

      // Should be called without is_active filter
      expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should return empty array when no counterparties exist', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/counterparties')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('should handle special characters in search', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);

      const specialChars = ['%', '_', '*', '?', '[', ']', '(', ')'];
      
      for (const char of specialChars) {
        await request(app)
          .get(`/api/counterparties?search=${encodeURIComponent(char)}`)
          .expect(200);

        expect(prisma.counterparty.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              OR: [
                { company_name: { contains: char, mode: 'insensitive' } },
                { company_code: { contains: char, mode: 'insensitive' } },
              ],
            },
          })
        );
      }
    });
  });

  describe('GET /api/counterparties/:id', () => {
    it('should return a single counterparty with relations', async () => {
      (prisma.counterparty.findUnique as jest.Mock).mockResolvedValue(mockCounterpartyWithRelations);

      const response = await request(app)
        .get(`/api/counterparties/${mockCounterparty.counterparty_id}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockCounterpartyWithRelations,
          created_at: mockCounterpartyWithRelations.created_at.toISOString(),
          updated_at: mockCounterpartyWithRelations.updated_at.toISOString(),
          quotas: mockCounterpartyWithRelations.quotas.map(q => ({
            ...q,
            period_month: q.period_month.toISOString(),
          })),
        },
      });

      expect(prisma.counterparty.findUnique).toHaveBeenCalledWith({
        where: { counterparty_id: mockCounterparty.counterparty_id },
        include: {
          quotas: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
          call_offs: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
        },
      });
    });

    it('should return 404 for non-existent counterparty', async () => {
      (prisma.counterparty.findUnique as jest.Mock).mockResolvedValue(null);

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/counterparties/${nonExistentId}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Counterparty not found',
      });
    });

    it('should handle invalid UUID format', async () => {
      await request(app)
        .get('/api/counterparties/not-a-valid-uuid')
        .expect(200); // Will still make the query

      expect(prisma.counterparty.findUnique).toHaveBeenCalledWith({
        where: { counterparty_id: 'not-a-valid-uuid' },
        include: expect.any(Object),
      });
    });

    it('should handle database errors when fetching single counterparty', async () => {
      (prisma.counterparty.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database timeout')
      );

      const response = await request(app)
        .get(`/api/counterparties/${mockCounterparty.counterparty_id}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database timeout',
      });
    });

    it('should limit related records to 10', async () => {
      const counterpartyWithManyRelations = {
        ...mockCounterparty,
        quotas: Array(15).fill(null).map((_, i) => ({
          quota_id: `quota-${i}`,
          metal_code: 'ALU',
          qty_t: 100,
        })),
        call_offs: Array(20).fill(null).map((_, i) => ({
          call_off_id: `calloff-${i}`,
          call_off_no: `CO-2025-${String(i).padStart(4, '0')}`,
          bundle_qty: 50,
        })),
      };

      (prisma.counterparty.findUnique as jest.Mock).mockResolvedValue(counterpartyWithManyRelations);

      await request(app)
        .get(`/api/counterparties/${mockCounterparty.counterparty_id}`)
        .expect(200);

      const findUniqueCall = (prisma.counterparty.findUnique as jest.Mock).mock.calls[0][0];
      expect(findUniqueCall.include.quotas.take).toBe(10);
      expect(findUniqueCall.include.call_offs.take).toBe(10);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      (prisma.counterparty.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.counterparty.findUnique as jest.Mock).mockResolvedValue(mockCounterparty);

      // Test list endpoint
      await request(app)
        .get('/api/counterparties')
        .expect(200);

      // Test single endpoint
      await request(app)
        .get(`/api/counterparties/${mockCounterparty.counterparty_id}`)
        .expect(200);

      // Auth middleware should have been called for both
      const authMock = jest.requireMock('../../middleware/auth') as any;
      expect(authMock.requireAuth).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle Prisma connection errors', async () => {
      const connectionError = new Error('Can\'t reach database server');
      (prisma.counterparty.findMany as jest.Mock).mockRejectedValue(connectionError);

      const response = await request(app)
        .get('/api/counterparties')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Can\'t reach database server',
      });
    });

    it('should handle unexpected errors without message', async () => {
      const weirdError = { code: 'WEIRD_ERROR' };
      (prisma.counterparty.findMany as jest.Mock).mockRejectedValue(weirdError);

      const response = await request(app)
        .get('/api/counterparties')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch counterparties',
      });
    });
  });
});