import request from 'supertest';
import express from 'express';
import 'express-async-errors'; // Import this before routes
import shipmentLinesRouter from '../shipment-lines';
import { prisma } from '../../../db/client';
import { ZodError } from 'zod';

// Mock Prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    shipmentLine: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    callOff: {
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
app.use('/api/call-offs/:callOffId/shipment-lines', shipmentLinesRouter);
app.use('/api/shipment-lines', shipmentLinesRouter);

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
const mockCallOff = {
  call_off_id: '123e4567-e89b-12d3-a456-426614174000',
  call_off_number: 'CO-2025-123456',
  quota_id: '223e4567-e89b-12d3-a456-426614174000',
  counterparty_id: '323e4567-e89b-12d3-a456-426614174000',
  direction: 'BUY',
  incoterm_code: 'FOB',
  bundle_qty: 100,
  status: 'NEW',
  requested_delivery_date: new Date('2025-02-15'),
  created_by: 'test-user-123',
  created_at: new Date('2025-01-15T10:00:00Z'),
  updated_at: new Date('2025-01-15T10:00:00Z'),
};

const mockShipmentLine = {
  shipment_line_id: '423e4567-e89b-12d3-a456-426614174000',
  call_off_id: mockCallOff.call_off_id,
  bundle_qty: 50,
  metal_code: 'ALU',
  destination_party_id: '523e4567-e89b-12d3-a456-426614174000',
  expected_ship_date: new Date('2025-02-20'),
  delivery_location: 'Port of Rotterdam',
  requested_delivery_date: new Date('2025-02-25'),
  notes: 'Handle with care',
  status: 'PLANNED',
  created_at: new Date('2025-01-16T10:00:00Z'),
  updated_at: new Date('2025-01-16T10:00:00Z'),
  shipped_at: null,
  delivered_at: null,
};

describe('Shipment Lines API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/call-offs/:callOffId/shipment-lines', () => {
    it('should return all shipment lines for a call-off', async () => {
      const mockShipmentLines = [
        mockShipmentLine,
        {
          ...mockShipmentLine,
          shipment_line_id: '523e4567-e89b-12d3-a456-426614174000',
          bundle_qty: 30,
          status: 'SHIPPED',
          shipped_at: new Date('2025-01-20T10:00:00Z'),
        },
      ];

      (prisma.shipmentLine.findMany as jest.Mock).mockResolvedValue(mockShipmentLines);

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockShipmentLines.map(sl => ({
          ...sl,
          expected_ship_date: sl.expected_ship_date.toISOString(),
          requested_delivery_date: sl.requested_delivery_date.toISOString(),
          created_at: sl.created_at.toISOString(),
          updated_at: sl.updated_at.toISOString(),
          shipped_at: sl.shipped_at ? sl.shipped_at.toISOString() : null,
        })),
        count: 2,
      });

      expect(prisma.shipmentLine.findMany).toHaveBeenCalledWith({
        where: { call_off_id: mockCallOff.call_off_id },
        orderBy: { created_at: 'asc' },
      });
    });

    it('should return empty array when no shipment lines exist', async () => {
      (prisma.shipmentLine.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.shipmentLine.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('POST /api/call-offs/:callOffId/shipment-lines', () => {
    const validShipmentLineData = {
      bundle_qty: 40,
      metal_code: 'ALU',
      destination_party_id: '523e4567-e89b-12d3-a456-426614174000',
      expected_ship_date: '2025-02-20T00:00:00Z',
      delivery_location: 'Port of Hamburg',
      requested_delivery_date: '2025-02-28T00:00:00Z',
      notes: 'Priority shipment',
    };

    it('should create a new shipment line with valid data', async () => {
      // Mock call-off lookup with existing shipment lines
      const callOffWithShipments = {
        ...mockCallOff,
        shipment_lines: [
          { bundle_qty: 30 },
          { bundle_qty: 20 },
        ],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);

      // Mock shipment line creation
      const createdShipmentLine = {
        ...mockShipmentLine,
        ...validShipmentLineData,
        expected_ship_date: new Date(validShipmentLineData.expected_ship_date),
        requested_delivery_date: new Date(validShipmentLineData.requested_delivery_date),
      };
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue(createdShipmentLine);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(validShipmentLineData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...createdShipmentLine,
          expected_ship_date: createdShipmentLine.expected_ship_date.toISOString(),
          requested_delivery_date: createdShipmentLine.requested_delivery_date.toISOString(),
          created_at: createdShipmentLine.created_at.toISOString(),
          updated_at: createdShipmentLine.updated_at.toISOString(),
        },
      });

      expect(prisma.shipmentLine.create).toHaveBeenCalledWith({
        data: {
          call_off_id: mockCallOff.call_off_id,
          bundle_qty: validShipmentLineData.bundle_qty,
          metal_code: validShipmentLineData.metal_code,
          destination_party_id: validShipmentLineData.destination_party_id,
          expected_ship_date: new Date(validShipmentLineData.expected_ship_date),
          delivery_location: validShipmentLineData.delivery_location,
          requested_delivery_date: new Date(validShipmentLineData.requested_delivery_date),
          notes: validShipmentLineData.notes,
          status: 'PLANNED',
        },
      });
    });

    it('should create shipment line with minimal required data', async () => {
      const minimalData = {
        bundle_qty: 25,
        metal_code: 'COP',
      };

      const callOffWithNoShipments = {
        ...mockCallOff,
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithNoShipments);
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue({
        ...mockShipmentLine,
        ...minimalData,
        destination_party_id: null,
        expected_ship_date: null,
        delivery_location: null,
        requested_delivery_date: null,
        notes: null,
      });

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(minimalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(prisma.shipmentLine.create).toHaveBeenCalledWith({
        data: {
          call_off_id: mockCallOff.call_off_id,
          bundle_qty: minimalData.bundle_qty,
          metal_code: minimalData.metal_code,
          destination_party_id: undefined,
          expected_ship_date: undefined,
          delivery_location: undefined,
          requested_delivery_date: undefined,
          notes: undefined,
          status: 'PLANNED',
        },
      });
    });

    it('should return 400 when call-off does not exist', async () => {
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(validShipmentLineData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid call_off_id: Call-off not found',
      });
    });

    it('should return 400 when call-off status is CANCELLED', async () => {
      const cancelledCallOff = {
        ...mockCallOff,
        status: 'CANCELLED',
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(cancelledCallOff);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(validShipmentLineData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot add shipment lines to call-off with status: CANCELLED',
      });
    });

    it('should return 400 when call-off status is FULFILLED', async () => {
      const fulfilledCallOff = {
        ...mockCallOff,
        status: 'FULFILLED',
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(fulfilledCallOff);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(validShipmentLineData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot add shipment lines to call-off with status: FULFILLED',
      });
    });

    it('should allow adding shipment lines to CONFIRMED call-off', async () => {
      const confirmedCallOff = {
        ...mockCallOff,
        status: 'CONFIRMED',
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(confirmedCallOff);
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue(mockShipmentLine);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 50, metal_code: 'ALU' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when total quantity would exceed call-off quantity', async () => {
      const callOffWithShipments = {
        ...mockCallOff,
        bundle_qty: 100,
        shipment_lines: [
          { bundle_qty: 40 },
          { bundle_qty: 35 },
        ],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 30, metal_code: 'ALU' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Total shipment quantity would exceed call-off quantity (100 bundles)',
      });
    });

    it('should allow exact match of call-off quantity', async () => {
      const callOffWithShipments = {
        ...mockCallOff,
        bundle_qty: 100,
        shipment_lines: [
          { bundle_qty: 60 },
        ],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue(mockShipmentLine);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 40, metal_code: 'ALU' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for negative bundle_qty', async () => {
      const invalidData = {
        bundle_qty: -10,
        metal_code: 'ALU',
      };

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should return 400 for bundle_qty exceeding maximum', async () => {
      const invalidData = {
        bundle_qty: 10001,
        metal_code: 'ALU',
      };

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should return 400 for invalid UUID in destination_party_id', async () => {
      const invalidData = {
        bundle_qty: 50,
        metal_code: 'ALU',
        destination_party_id: 'not-a-uuid',
      };

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should handle database errors during creation', async () => {
      const callOffWithShipments = {
        ...mockCallOff,
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);
      (prisma.shipmentLine.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(validShipmentLineData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('PATCH /api/shipment-lines/:id', () => {
    const updateData = {
      bundle_qty: 60,
      expected_ship_date: '2025-02-22T00:00:00Z',
      status: 'READY',
      notes: 'Updated priority',
    };

    it('should update a shipment line with valid data', async () => {
      const updatedShipmentLine = {
        ...mockShipmentLine,
        ...updateData,
        expected_ship_date: new Date(updateData.expected_ship_date),
      };
      (prisma.shipmentLine.update as jest.Mock).mockResolvedValue(updatedShipmentLine);

      const response = await request(app)
        .patch(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...updatedShipmentLine,
          expected_ship_date: updatedShipmentLine.expected_ship_date.toISOString(),
          requested_delivery_date: updatedShipmentLine.requested_delivery_date.toISOString(),
          created_at: updatedShipmentLine.created_at.toISOString(),
          updated_at: updatedShipmentLine.updated_at.toISOString(),
        },
      });

      expect(prisma.shipmentLine.update).toHaveBeenCalledWith({
        where: { shipment_line_id: mockShipmentLine.shipment_line_id },
        data: {
          bundle_qty: updateData.bundle_qty,
          expected_ship_date: new Date(updateData.expected_ship_date),
          status: updateData.status,
          notes: updateData.notes,
          metal_code: undefined,
          destination_party_id: undefined,
          delivery_location: undefined,
          requested_delivery_date: undefined,
        },
      });
    });

    it('should update only specified fields', async () => {
      const partialUpdate = {
        status: 'SHIPPED',
      };

      const updatedShipmentLine = {
        ...mockShipmentLine,
        status: 'SHIPPED',
      };
      (prisma.shipmentLine.update as jest.Mock).mockResolvedValue(updatedShipmentLine);

      await request(app)
        .patch(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
        .send(partialUpdate)
        .expect(200);

      expect(prisma.shipmentLine.update).toHaveBeenCalledWith({
        where: { shipment_line_id: mockShipmentLine.shipment_line_id },
        data: {
          status: partialUpdate.status,
          bundle_qty: undefined,
          metal_code: undefined,
          destination_party_id: undefined,
          expected_ship_date: undefined,
          delivery_location: undefined,
          requested_delivery_date: undefined,
          notes: undefined,
        },
      });
    });

    it('should handle status transitions', async () => {
      const statusTransitions = [
        { from: 'PLANNED', to: 'READY' },
        { from: 'READY', to: 'PICKED' },
        { from: 'PICKED', to: 'SHIPPED' },
        { from: 'SHIPPED', to: 'DELIVERED' },
      ];

      for (const transition of statusTransitions) {
        const shipmentLine = {
          ...mockShipmentLine,
          status: transition.from,
        };
        const updatedShipmentLine = {
          ...shipmentLine,
          status: transition.to,
        };
        (prisma.shipmentLine.update as jest.Mock).mockResolvedValue(updatedShipmentLine);

        const response = await request(app)
          .patch(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
          .send({ status: transition.to })
          .expect(200);

        expect(response.body.data.status).toBe(transition.to);
      }
    });

    it('should return 400 for invalid status value', async () => {
      const invalidData = {
        status: 'INVALID_STATUS',
      };

      const response = await request(app)
        .patch(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should handle non-existent shipment line gracefully', async () => {
      (prisma.shipmentLine.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const response = await request(app)
        .patch('/api/shipment-lines/999e4567-e89b-12d3-a456-426614174000')
        .send(updateData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle database errors during update', async () => {
      (prisma.shipmentLine.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
        .send(updateData)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('DELETE /api/shipment-lines/:id', () => {
    it('should delete a PLANNED shipment line', async () => {
      const plannedShipmentLine = {
        ...mockShipmentLine,
        status: 'PLANNED',
        call_off: mockCallOff,
      };
      (prisma.shipmentLine.findUnique as jest.Mock).mockResolvedValue(plannedShipmentLine);
      (prisma.shipmentLine.delete as jest.Mock).mockResolvedValue(plannedShipmentLine);

      const response = await request(app)
        .delete(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Shipment line deleted successfully',
      });

      expect(prisma.shipmentLine.delete).toHaveBeenCalledWith({
        where: { shipment_line_id: mockShipmentLine.shipment_line_id },
      });
    });

    it('should return 404 for non-existent shipment line', async () => {
      (prisma.shipmentLine.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/shipment-lines/999e4567-e89b-12d3-a456-426614174000')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Shipment line not found',
      });
    });

    it('should return 400 when trying to delete non-PLANNED shipment line', async () => {
      const statuses = ['READY', 'PICKED', 'SHIPPED', 'DELIVERED'];

      for (const status of statuses) {
        const shipmentLine = {
          ...mockShipmentLine,
          status,
          call_off: mockCallOff,
        };
        (prisma.shipmentLine.findUnique as jest.Mock).mockResolvedValue(shipmentLine);

        const response = await request(app)
          .delete(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Only PLANNED shipment lines can be deleted',
        });
      }
    });

    it('should handle database errors during deletion', async () => {
      const plannedShipmentLine = {
        ...mockShipmentLine,
        status: 'PLANNED',
        call_off: mockCallOff,
      };
      (prisma.shipmentLine.findUnique as jest.Mock).mockResolvedValue(plannedShipmentLine);
      (prisma.shipmentLine.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/shipment-lines/${mockShipmentLine.shipment_line_id}`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('Authentication', () => {
    it('should include auth information in all requests', async () => {
      (prisma.shipmentLine.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .expect(200);

      // Auth middleware should have been called
      const authMock = jest.requireMock('../../middleware/auth') as any;
      expect(authMock.requireAuth).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle shipment lines with null optional fields', async () => {
      const shipmentLineWithNulls = {
        ...mockShipmentLine,
        destination_party_id: null,
        expected_ship_date: null,
        delivery_location: null,
        requested_delivery_date: null,
        notes: null,
        shipped_at: null,
        delivered_at: null,
      };

      (prisma.shipmentLine.findMany as jest.Mock).mockResolvedValue([shipmentLineWithNulls]);

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .expect(200);

      expect(response.body.data[0]).toMatchObject({
        destination_party_id: null,
        expected_ship_date: null,
        delivery_location: null,
        requested_delivery_date: null,
        notes: null,
        shipped_at: null,
        delivered_at: null,
      });
    });

    it('should handle call-off with maximum number of shipment lines', async () => {
      const manyShipmentLines = Array(20).fill(null).map(() => ({
        bundle_qty: 5,
      }));

      const callOffWithManyShipments = {
        ...mockCallOff,
        bundle_qty: 100,
        shipment_lines: manyShipmentLines.slice(0, 19), // 95 bundles used
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithManyShipments);
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue(mockShipmentLine);

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 5, metal_code: 'ALU' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle very small bundle quantities', async () => {
      const callOffWithShipments = {
        ...mockCallOff,
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue({
        ...mockShipmentLine,
        bundle_qty: 1,
      });

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 1, metal_code: 'ALU' })
        .expect(201);

      expect(response.body.data.bundle_qty).toBe(1);
    });

    it('should handle concurrent shipment line creation for same call-off', async () => {
      // Simulate scenario where available quantity changes between check and create
      const callOffWithShipments = {
        ...mockCallOff,
        bundle_qty: 100,
        shipment_lines: [{ bundle_qty: 80 }],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);

      // But creation fails due to constraint
      (prisma.shipmentLine.create as jest.Mock).mockRejectedValue(
        new Error('Quantity constraint violation')
      );

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 20, metal_code: 'ALU' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle metal_code at maximum length', async () => {
      const maxLengthMetalCode = 'A'.repeat(12);
      const dataWithMaxMetalCode = {
        bundle_qty: 50,
        metal_code: maxLengthMetalCode,
      };

      const callOffWithShipments = {
        ...mockCallOff,
        shipment_lines: [],
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithShipments);
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue({
        ...mockShipmentLine,
        metal_code: maxLengthMetalCode,
      });

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(dataWithMaxMetalCode)
        .expect(201);

      expect(response.body.data.metal_code).toBe(maxLengthMetalCode);
    });

    it('should return 400 for metal_code exceeding maximum length', async () => {
      const tooLongMetalCode = 'A'.repeat(13);
      const invalidData = {
        bundle_qty: 50,
        metal_code: tooLongMetalCode,
      };

      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should handle empty result sets gracefully', async () => {
      (prisma.shipmentLine.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      });
    });

    it('should properly calculate remaining quantity with multiple shipment lines', async () => {
      const callOffWithComplexShipments = {
        ...mockCallOff,
        bundle_qty: 100,
        shipment_lines: [
          { bundle_qty: 25 },
          { bundle_qty: 30 },
          { bundle_qty: 15 },
          { bundle_qty: 20 },
        ], // Total: 90 bundles used
      };
      (prisma.callOff.findUnique as jest.Mock).mockResolvedValue(callOffWithComplexShipments);

      // Try to add 11 bundles (should fail)
      const response = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 11, metal_code: 'ALU' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Total shipment quantity would exceed call-off quantity (100 bundles)',
      });

      // Try to add exactly 10 bundles (should succeed)
      (prisma.shipmentLine.create as jest.Mock).mockResolvedValue(mockShipmentLine);
      
      const successResponse = await request(app)
        .post(`/api/call-offs/${mockCallOff.call_off_id}/shipment-lines`)
        .send({ bundle_qty: 10, metal_code: 'ALU' })
        .expect(201);

      expect(successResponse.body.success).toBe(true);
    });
  });
});