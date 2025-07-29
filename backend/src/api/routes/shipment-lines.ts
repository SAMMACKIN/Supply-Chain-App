import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

const createShipmentLineSchema = z.object({
  bundle_qty: z.number().int().min(1).max(10000),
  metal_code: z.string().max(12),
  destination_party_id: z.string().uuid().optional(),
  expected_ship_date: z.string().datetime().optional(),
  delivery_location: z.string().optional(),
  requested_delivery_date: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateShipmentLineSchema = z.object({
  bundle_qty: z.number().int().min(1).max(10000).optional(),
  metal_code: z.string().max(12).optional(),
  destination_party_id: z.string().uuid().optional(),
  expected_ship_date: z.string().datetime().optional(),
  delivery_location: z.string().optional(),
  requested_delivery_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.enum(['PLANNED', 'READY', 'PICKED', 'SHIPPED', 'DELIVERED']).optional(),
});

router.get('/', requireAuth, async (req, res) => {
  const { callOffId } = req.params;
  
  const shipmentLines = await prisma.shipmentLine.findMany({
    where: { call_off_id: callOffId },
    orderBy: { created_at: 'asc' },
  });
  
  res.json({
    success: true,
    data: shipmentLines,
    count: shipmentLines.length,
  });
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { callOffId } = req.params;
  const data = createShipmentLineSchema.parse(req.body);
  
  const callOff = await prisma.callOff.findUnique({
    where: { call_off_id: callOffId },
    include: {
      shipment_lines: true,
    },
  });
  
  if (!callOff) {
    res.status(400).json({
      success: false,
      error: 'Invalid call_off_id: Call-off not found',
    });
    return;
  }
  
  if (!['NEW', 'CONFIRMED'].includes(callOff.status)) {
    res.status(400).json({
      success: false,
      error: `Cannot add shipment lines to call-off with status: ${callOff.status}`,
    });
    return;
  }
  
  const currentQty = callOff.shipment_lines.reduce((sum, line) => sum + line.bundle_qty, 0);
  if (currentQty + data.bundle_qty > callOff.bundle_qty) {
    res.status(400).json({
      success: false,
      error: `Total shipment quantity would exceed call-off quantity (${callOff.bundle_qty} bundles)`,
    });
    return;
  }
  
  const shipmentLine = await prisma.shipmentLine.create({
    data: {
      call_off_id: callOffId,
      bundle_qty: data.bundle_qty,
      metal_code: data.metal_code,
      destination_party_id: data.destination_party_id,
      expected_ship_date: data.expected_ship_date ? new Date(data.expected_ship_date) : undefined,
      delivery_location: data.delivery_location,
      requested_delivery_date: data.requested_delivery_date ? new Date(data.requested_delivery_date) : undefined,
      notes: data.notes,
      status: 'PLANNED' as any,
    },
  });
  
  res.status(201).json({
    success: true,
    data: shipmentLine,
  });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const data = updateShipmentLineSchema.parse(req.body);
  
  const shipmentLine = await prisma.shipmentLine.update({
    where: { shipment_line_id: id },
    data: {
      ...data,
      expected_ship_date: data.expected_ship_date ? new Date(data.expected_ship_date) : undefined,
      requested_delivery_date: data.requested_delivery_date ? new Date(data.requested_delivery_date) : undefined,
    },
  });
  
  res.json({
    success: true,
    data: shipmentLine,
  });
});

router.delete('/:id', requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  
  const shipmentLine = await prisma.shipmentLine.findUnique({
    where: { shipment_line_id: id },
    include: {
      call_off: true,
    },
  });
  
  if (!shipmentLine) {
    res.status(404).json({
      success: false,
      error: 'Shipment line not found',
    });
    return;
  }
  
  if (shipmentLine.status !== 'PLANNED') {
    res.status(400).json({
      success: false,
      error: 'Only PLANNED shipment lines can be deleted',
    });
    return;
  }
  
  await prisma.shipmentLine.delete({
    where: { shipment_line_id: id },
  });
  
  res.json({
    success: true,
    message: 'Shipment line deleted successfully',
  });
});

export default router;