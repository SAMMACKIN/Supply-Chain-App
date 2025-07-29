import request from 'supertest';
import express from 'express';
import 'express-async-errors'; // Import this before routes
import callOffsRouter from '../calloffs';
import { prisma } from '../../../db/client';
import { ZodError } from 'zod';

// Mock Prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    callOff: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    quota: {
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

// Mock shipment-lines routes
jest.mock('../shipment-lines', () => {
  const router = require('express').Router();
  return router;
});

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/call-offs', callOffsRouter);

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
  incoterm_code: 'FOB',
  counterparty: {
    counterparty_id: '223e4567-e89b-12d3-a456-426614174000',
    company_name: 'Test Company Ltd',
    company_code: 'TC001',
  },
};

const mockCallOff = {
  call_off_id: '323e4567-e89b-12d3-a456-426614174000',
  call_off_number: 'CO-2025-123456',
  quota_id: mockQuota.quota_id,
  counterparty_id: mockQuota.counterparty_id,
  direction: 'BUY',
  incoterm_code: 'FOB',
  bundle_qty: 100,
  status: 'NEW',
  requested_delivery_date: new Date('2025-02-15'),
  created_by: 'test-user-123',
  created_at: new Date('2025-01-15T10:00:00Z'),
  updated_at: new Date('2025-01-15T10:00:00Z'),
  confirmed_at: null,
  cancelled_at: null,
  fulfilled_at: null,
  cancellation_reason: null,
};

const mockCallOffWithRelations = {
  ...mockCallOff,
  quota: mockQuota,
  counterparty: mockQuota.counterparty,
  _count: {
    shipment_lines: 2,
  },
};

describe('Call-Offs API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/call-offs', () => {
    it('should return all call-offs with relations', async () => {
      // Mock Prisma response
      (prisma.callOff.findMany as jest.Mock).mockResolvedValue([mockCallOffWithRelations]);

      const response = await request(app)
        .get('/api/call-offs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [
          {
            ...mockCallOffWithRelations,
            // Date objects are serialized to strings in JSON
            requested_delivery_date: mockCallOff.requested_delivery_date.toISOString(),
            created_at: mockCallOff.created_at.toISOString(),
            updated_at: mockCallOff.updated_at.toISOString(),
            quota: {
              ...mockQuota,
              period_month: mockQuota.period_month.toISOString(),
            },
          },
        ],
        count: 1,
      });

      expect(prisma.callOff.findMany).toHaveBeenCalledWith({
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
    });

    it('should return empty array when no call-offs exist', async () => {
      (prisma.callOff.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/call-offs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.callOff.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/call-offs')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('GET /api/call-offs/:id', () => {
    it('should return a single call-off with all relations', async () => {
      const mockDetailedCallOff = {
        ...mockCallOff,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
        shipment_lines: [
          {
            shipment_line_id: '423e4567-e89b-12d3-a456-426614174000',
            bundle_qty: 50,
            status: 'PLANNED',
            created_at: new Date('2025-01-16T10:00:00Z'),
          },
          {
            shipment_line_id: '523e4567-e89b-12d3-a456-426614174000',
            bundle_qty: 50,
            status: 'SHIPPED',
            created_at: new Date('2025-01-17T10:00:00Z'),
          },
        ],
      };

      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(mockDetailedCallOff);

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockDetailedCallOff,
          requested_delivery_date: mockCallOff.requested_delivery_date.toISOString(),
          created_at: mockCallOff.created_at.toISOString(),
          updated_at: mockCallOff.updated_at.toISOString(),
          quota: {
            ...mockQuota,
            period_month: mockQuota.period_month.toISOString(),
          },
          shipment_lines: mockDetailedCallOff.shipment_lines.map(sl => ({
            ...sl,
            created_at: sl.created_at.toISOString(),
          })),
        },
      });

      expect(prisma.callOff.findUnique).toHaveBeenCalledWith({
        where: { call_off_id: mockCallOff.call_off_id },
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
    });

    it('should return 404 for non-existent call-off', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(null);

      const nonExistentId = '999e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/call-offs/${nonExistentId}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Call-off not found',
      });
    });

    it('should handle database errors when fetching single call-off', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('POST /api/call-offs', () => {
    const validCallOffData = {
      quota_id: mockQuota.quota_id,
      bundle_qty: 100,
      requested_delivery_date: '2025-02-15T00:00:00Z',
    };

    it('should create a new call-off with valid data', async () => {
      // Mock quota lookup
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      
      // Mock quota usage calculation
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 200 },
      });

      // Mock call-off creation
      const createdCallOff = {
        ...mockCallOff,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      };
      (prisma.callOff.create as jest.Mock).mockResolvedValue(createdCallOff);

      const response = await request(app)
        .post('/api/call-offs')
        .send(validCallOffData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...createdCallOff,
          requested_delivery_date: mockCallOff.requested_delivery_date.toISOString(),
          created_at: mockCallOff.created_at.toISOString(),
          updated_at: mockCallOff.updated_at.toISOString(),
          quota: {
            ...mockQuota,
            period_month: mockQuota.period_month.toISOString(),
          },
        },
      });

      // Verify call-off creation parameters
      expect(prisma.callOff.create).toHaveBeenCalledWith({
        data: {
          call_off_number: expect.stringMatching(/^CO-\d{4}-\d{6}$/),
          quota_id: validCallOffData.quota_id,
          counterparty_id: mockQuota.counterparty_id,
          direction: mockQuota.direction,
          incoterm_code: mockQuota.incoterm_code,
          bundle_qty: validCallOffData.bundle_qty,
          requested_delivery_date: new Date(validCallOffData.requested_delivery_date),
          created_by: 'test-user-123',
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
    });

    it('should create call-off without requested_delivery_date', async () => {
      const dataWithoutDate = {
        quota_id: mockQuota.quota_id,
        bundle_qty: 50,
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 0 },
      });
      (prisma.callOff.create as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        requested_delivery_date: null,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      });

      const response = await request(app)
        .post('/api/call-offs')
        .send(dataWithoutDate)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(prisma.callOff.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requested_delivery_date: undefined,
          }),
        })
      );
    });

    it('should return 400 when quota does not exist', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/call-offs')
        .send(validCallOffData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid quota_id: Quota not found',
      });
    });

    it('should return 400 when requested quantity exceeds available quota', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      
      // Mock that 950 bundles are already used
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 950 },
      });

      const response = await request(app)
        .post('/api/call-offs')
        .send(validCallOffData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient quota: only 50 bundles available',
      });
    });

    it('should exclude CANCELLED call-offs from quota availability calculation', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 500 },
      });
      (prisma.callOff.create as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      });

      await request(app)
        .post('/api/call-offs')
        .send(validCallOffData)
        .expect(201);

      // Verify that aggregate query excludes CANCELLED status
      expect(prisma.callOff.aggregate).toHaveBeenCalledWith({
        where: {
          quota_id: validCallOffData.quota_id,
          status: { notIn: ['CANCELLED'] },
        },
        _sum: {
          bundle_qty: true,
        },
      });
    });

    it('should return 400 for invalid UUID in quota_id', async () => {
      const invalidData = {
        ...validCallOffData,
        quota_id: 'not-a-uuid',
      };

      const response = await request(app)
        .post('/api/call-offs')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should return 400 for negative bundle_qty', async () => {
      const invalidData = {
        ...validCallOffData,
        bundle_qty: -10,
      };

      const response = await request(app)
        .post('/api/call-offs')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should return 400 for bundle_qty exceeding maximum', async () => {
      const invalidData = {
        ...validCallOffData,
        bundle_qty: 10001,
      };

      const response = await request(app)
        .post('/api/call-offs')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should handle database errors during creation', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 0 },
      });
      (prisma.callOff.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/call-offs')
        .send(validCallOffData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('PATCH /api/call-offs/:id', () => {
    const updateData = {
      bundle_qty: 150,
      requested_delivery_date: '2025-03-01T00:00:00Z',
    };

    it('should update a NEW call-off', async () => {
      // Mock existing call-off lookup
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        status: 'NEW',
      });

      // Mock update
      const updatedCallOff = {
        ...mockCallOff,
        bundle_qty: updateData.bundle_qty,
        requested_delivery_date: new Date(updateData.requested_delivery_date),
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      };
      (prisma.callOff.update as jest.Mock).mockResolvedValue(updatedCallOff);

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...updatedCallOff,
          requested_delivery_date: updatedCallOff.requested_delivery_date.toISOString(),
          created_at: mockCallOff.created_at.toISOString(),
          updated_at: mockCallOff.updated_at.toISOString(),
          quota: {
            ...mockQuota,
            period_month: mockQuota.period_month.toISOString(),
          },
        },
      });

      expect(prisma.callOff.update).toHaveBeenCalledWith({
        where: { call_off_id: mockCallOff.call_off_id },
        data: {
          ...updateData,
          requested_delivery_date: new Date(updateData.requested_delivery_date),
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
    });

    it('should update only bundle_qty when requested_delivery_date is not provided', async () => {
      const partialUpdate = { bundle_qty: 200 };

      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        status: 'NEW',
      });
      (prisma.callOff.update as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        bundle_qty: partialUpdate.bundle_qty,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      });

      await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(partialUpdate)
        .expect(200);

      expect(prisma.callOff.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            bundle_qty: partialUpdate.bundle_qty,
            requested_delivery_date: undefined,
          },
        })
      );
    });

    it('should return 404 for non-existent call-off', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Call-off not found',
      });
    });

    it('should return 400 when trying to update a CONFIRMED call-off', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        status: 'CONFIRMED',
      });

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Only NEW call-offs can be edited',
      });
    });

    it('should return 400 when trying to update a CANCELLED call-off', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        status: 'CANCELLED',
      });

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Only NEW call-offs can be edited',
      });
    });

    it('should return 400 when trying to update a FULFILLED call-off', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        status: 'FULFILLED',
      });

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Only NEW call-offs can be edited',
      });
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        bundle_qty: 'not-a-number',
      };

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should handle database errors during update', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        status: 'NEW',
      });
      (prisma.callOff.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch(`/api/call-offs/${mockCallOff.call_off_id}`)
        .send(updateData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('POST /api/call-offs/:id/confirm', () => {
    it('should confirm a NEW call-off', async () => {
      const confirmedCallOff = {
        ...mockCallOff,
        status: 'CONFIRMED',
        confirmed_at: new Date('2025-01-16T12:00:00Z'),
      };

      (prisma.callOff.update as jest.Mock).mockResolvedValue(confirmedCallOff);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/confirm`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...confirmedCallOff,
          requested_delivery_date: mockCallOff.requested_delivery_date.toISOString(),
          created_at: mockCallOff.created_at.toISOString(),
          updated_at: mockCallOff.updated_at.toISOString(),
          confirmed_at: confirmedCallOff.confirmed_at.toISOString(),
        },
      });

      expect(prisma.callOff.update).toHaveBeenCalledWith({
        where: {
          call_off_id: mockCallOff.call_off_id,
          status: 'NEW',
        },
        data: {
          status: 'CONFIRMED',
          confirmed_at: expect.any(Date),
        },
      });
    });

    it('should handle attempting to confirm non-NEW call-off', async () => {
      // When Prisma update finds no matching record (wrong status), it throws
      (prisma.callOff.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/confirm`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle database errors during confirmation', async () => {
      (prisma.callOff.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/confirm`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('POST /api/call-offs/:id/cancel', () => {
    it('should cancel a NEW call-off', async () => {
      const cancelledCallOff = {
        ...mockCallOff,
        status: 'CANCELLED',
        cancelled_at: new Date('2025-01-16T12:00:00Z'),
      };

      (prisma.callOff.update as jest.Mock).mockResolvedValue(cancelledCallOff);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/cancel`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...cancelledCallOff,
          requested_delivery_date: mockCallOff.requested_delivery_date.toISOString(),
          created_at: mockCallOff.created_at.toISOString(),
          updated_at: mockCallOff.updated_at.toISOString(),
          cancelled_at: cancelledCallOff.cancelled_at.toISOString(),
        },
      });

      expect(prisma.callOff.update).toHaveBeenCalledWith({
        where: {
          call_off_id: mockCallOff.call_off_id,
          status: { in: ['NEW', 'CONFIRMED'] },
        },
        data: {
          status: 'CANCELLED',
          cancelled_at: expect.any(Date),
        },
      });
    });

    it('should cancel a CONFIRMED call-off', async () => {
      const confirmedCallOff = {
        ...mockCallOff,
        status: 'CONFIRMED',
        confirmed_at: new Date('2025-01-15T15:00:00Z'),
      };

      const cancelledCallOff = {
        ...confirmedCallOff,
        status: 'CANCELLED',
        cancelled_at: new Date('2025-01-16T12:00:00Z'),
      };

      (prisma.callOff.update as jest.Mock).mockResolvedValue(cancelledCallOff);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/cancel`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELLED');
    });

    it('should handle attempting to cancel FULFILLED call-off', async () => {
      // When Prisma update finds no matching record (wrong status), it throws
      (prisma.callOff.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/cancel`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle database errors during cancellation', async () => {
      (prisma.callOff.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/cancel`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('POST /api/call-offs/:id/fulfill', () => {
    it('should fulfill a CONFIRMED call-off', async () => {
      const fulfilledCallOff = {
        ...mockCallOff,
        status: 'FULFILLED',
        confirmed_at: new Date('2025-01-15T15:00:00Z'),
        fulfilled_at: new Date('2025-01-20T12:00:00Z'),
      };

      (prisma.callOff.update as jest.Mock).mockResolvedValue(fulfilledCallOff);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/fulfill`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...fulfilledCallOff,
          requested_delivery_date: mockCallOff.requested_delivery_date.toISOString(),
          created_at: mockCallOff.created_at.toISOString(),
          updated_at: mockCallOff.updated_at.toISOString(),
          confirmed_at: fulfilledCallOff.confirmed_at.toISOString(),
          fulfilled_at: fulfilledCallOff.fulfilled_at.toISOString(),
        },
      });

      expect(prisma.callOff.update).toHaveBeenCalledWith({
        where: {
          call_off_id: mockCallOff.call_off_id,
          status: 'CONFIRMED',
        },
        data: {
          status: 'FULFILLED',
          fulfilled_at: expect.any(Date),
        },
      });
    });

    it('should handle attempting to fulfill non-CONFIRMED call-off', async () => {
      // When Prisma update finds no matching record (wrong status), it throws
      (prisma.callOff.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/fulfill`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle database errors during fulfillment', async () => {
      (prisma.callOff.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/fulfill`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('Authentication', () => {
    it('should include auth information in all requests', async () => {
      (prisma.callOff.findMany as jest.Mock).mockResolvedValue([]);
      
      await request(app)
        .get('/api/call-offs')
        .expect(200);

      // Auth middleware should have been called
      const authMock = jest.requireMock('../../middleware/auth') as any;
      expect(authMock.requireAuth).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle call-offs with null optional fields', async () => {
      const callOffWithNulls = {
        ...mockCallOff,
        requested_delivery_date: null,
        confirmed_at: null,
        cancelled_at: null,
        fulfilled_at: null,
        cancellation_reason: null,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
        _count: { shipment_lines: 0 },
      };

      (prisma.callOff.findMany as jest.Mock).mockResolvedValue([callOffWithNulls]);

      const response = await request(app)
        .get('/api/call-offs')
        .expect(200);

      expect(response.body.data[0]).toMatchObject({
        requested_delivery_date: null,
        confirmed_at: null,
        cancelled_at: null,
        fulfilled_at: null,
        cancellation_reason: null,
      });
    });

    it('should handle quota with zero available quantity', async () => {
      const fullyUsedQuota = {
        ...mockQuota,
        qty_t: 100,
      };

      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(fullyUsedQuota);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 100 },
      });

      const response = await request(app)
        .post('/api/call-offs')
        .send({
          quota_id: mockQuota.quota_id,
          bundle_qty: 1,
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient quota: only 0 bundles available',
      });
    });

    it('should handle call-off number generation correctly', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 0 },
      });
      (prisma.callOff.create as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      });

      await request(app)
        .post('/api/call-offs')
        .send({
          quota_id: mockQuota.quota_id,
          bundle_qty: 50,
        })
        .expect(201);

      // Verify call-off number format
      expect(prisma.callOff.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            call_off_number: expect.stringMatching(/^CO-\d{4}-\d{6}$/),
          }),
        })
      );
    });

    it('should handle concurrent call-off creation for same quota', async () => {
      // Simulate scenario where available quota changes between check and create
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue(mockQuota);
      
      // First check shows 100 available
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { bundle_qty: 900 },
      });

      // But creation fails due to constraint
      (prisma.callOff.create as jest.Mock).mockRejectedValue(
        new Error('Quota constraint violation')
      );

      const response = await request(app)
        .post('/api/call-offs')
        .send({
          quota_id: mockQuota.quota_id,
          bundle_qty: 100,
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle very large bundle quantities at the limit', async () => {
      (prisma.quota.findUnique as jest.Mock).mockResolvedValue({
        ...mockQuota,
        qty_t: 10000,
      });
      (prisma.callOff.aggregate as jest.Mock).mockResolvedValue({
        _sum: { bundle_qty: 0 },
      });
      (prisma.callOff.create as jest.Mock).mockResolvedValue({
        ...mockCallOff,
        bundle_qty: 10000,
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      });

      const response = await request(app)
        .post('/api/call-offs')
        .send({
          quota_id: mockQuota.quota_id,
          bundle_qty: 10000, // Maximum allowed
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bundle_qty).toBe(10000);
    });

    it('should handle empty result sets gracefully', async () => {
      (prisma.callOff.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/call-offs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('should properly handle status transitions', async () => {
      // Test that status field is properly handled as an enum
      const callOffWithStatus = {
        ...mockCallOff,
        status: 'CONFIRMED', // Should be handled as enum
        quota: mockQuota,
        counterparty: mockQuota.counterparty,
      };

      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithStatus);

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}`)
        .expect(200);

      expect(response.body.data.status).toBe('CONFIRMED');
    });
  });
});