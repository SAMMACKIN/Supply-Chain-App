import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const createTransportOrderSchema = z.object({
  carrier_name: z.string().min(1).max(255),
  mode_of_transport: z.enum(['TRUCK', 'RAIL', 'VESSEL', 'AIR', 'MULTIMODAL']),
  equipment_type: z.enum([
    'CONTAINER_20FT', 'CONTAINER_40FT', 'CONTAINER_40HC',
    'FLATBED_TRAILER', 'ENCLOSED_TRAILER', 'RAIL_CAR',
    'TANK_CONTAINER', 'BULK_VESSEL'
  ]).optional(),
  equipment_number: z.string().optional(),
  dangerous_goods: z.boolean().optional().default(false),
  temperature_controlled: z.boolean().optional().default(false),
  special_instructions: z.string().optional(),
  estimated_cost: z.number().optional(),
  currency_code: z.string().length(3).optional(),
  shipment_lines: z.array(z.object({
    shipment_line_id: z.string().uuid(),
    planned_bundle_qty: z.number().int().min(1),
    planned_weight_kg: z.number().optional(),
  })).min(1),
  stops: z.array(z.object({
    stop_sequence: z.number().int().min(1),
    stop_type: z.enum(['PICKUP', 'DELIVERY', 'CROSS_DOCK', 'CUSTOMS', 'WEIGHBRIDGE']),
    location_name: z.string(),
    location_code: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state_province: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().length(2).optional(),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    scheduled_arrival: z.string().datetime().optional(),
    scheduled_departure: z.string().datetime().optional(),
  })).min(2), // At least pickup and delivery
});

const updateTransportOrderSchema = z.object({
  carrier_name: z.string().min(1).max(255).optional(),
  booking_reference: z.string().optional(),
  equipment_number: z.string().optional(),
  special_instructions: z.string().optional(),
  estimated_cost: z.number().optional(),
  actual_cost: z.number().optional(),
  status: z.enum(['DRAFT', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'EXCEPTION']).optional(),
});

// Helper function to generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TO-${year}${month}-${random}`;
}

// GET /api/transport-orders - List all transport orders
router.get('/', requireAuth, async (req, res) => {
  const { status, carrier_id, mode } = req.query;
  
  const where: any = {};
  if (status) where.status = status as string;
  if (carrier_id) where.carrier_id = carrier_id as string;
  if (mode) where.mode_of_transport = mode as string;
  
  const transportOrders = await prisma.transportOrder.findMany({
    where,
    include: {
      order_lines: {
        include: {
          shipment_line: {
            include: {
              call_off: true,
            }
          }
        }
      },
      stops: {
        orderBy: { stop_sequence: 'asc' }
      },
      _count: {
        select: {
          milestones: true,
          documents: true,
        }
      }
    },
    orderBy: { created_at: 'desc' },
  });
  
  res.json({
    success: true,
    data: transportOrders,
    count: transportOrders.length,
  });
});

// GET /api/transport-orders/:id - Get single transport order
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const transportOrder = await prisma.transportOrder.findUnique({
    where: { transport_order_id: id },
    include: {
      order_lines: {
        include: {
          shipment_line: {
            include: {
              call_off: {
                include: {
                  counterparty: true,
                  quota: true,
                }
              }
            }
          },
          bundle_allocations: {
            include: {
              bundle: true,
            }
          }
        }
      },
      stops: {
        orderBy: { stop_sequence: 'asc' }
      },
      milestones: {
        orderBy: { occurred_at: 'desc' }
      },
      documents: {
        where: { is_active: true }
      }
    }
  });
  
  if (!transportOrder) {
    return res.status(404).json({
      success: false,
      error: 'Transport order not found',
    });
  }
  
  res.json({
    success: true,
    data: transportOrder,
  });
});

// POST /api/transport-orders - Create new transport order
router.post('/', requireAuth, async (req, res) => {
  const userId = req.auth?.userId || '00000000-0000-0000-0000-000000000000';
  const data = createTransportOrderSchema.parse(req.body);
  
  // Validate shipment lines exist and are not already assigned
  const shipmentLineIds = data.shipment_lines.map(sl => sl.shipment_line_id);
  const existingShipmentLines = await prisma.shipmentLine.findMany({
    where: { 
      shipment_line_id: { in: shipmentLineIds }
    },
    include: {
      transport_order_lines: true,
    }
  });
  
  if (existingShipmentLines.length !== shipmentLineIds.length) {
    return res.status(400).json({
      success: false,
      error: 'One or more shipment lines not found',
    });
  }
  
  // Check if any shipment lines are already assigned to transport orders
  const alreadyAssigned = existingShipmentLines.filter(sl => sl.transport_order_lines.length > 0);
  if (alreadyAssigned.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'One or more shipment lines are already assigned to transport orders',
      details: alreadyAssigned.map(sl => sl.shipment_line_id),
    });
  }
  
  // Calculate total weight and bundle count
  const totalWeight = data.shipment_lines.reduce((sum, sl) => 
    sum + (sl.planned_weight_kg || 0), 0
  );
  const totalBundles = data.shipment_lines.reduce((sum, sl) => 
    sum + sl.planned_bundle_qty, 0
  );
  
  // Create transport order with all related data
  const transportOrder = await prisma.transportOrder.create({
    data: {
      order_number: generateOrderNumber(),
      carrier_name: data.carrier_name,
      mode_of_transport: data.mode_of_transport,
      equipment_type: data.equipment_type,
      equipment_number: data.equipment_number,
      dangerous_goods: data.dangerous_goods,
      temperature_controlled: data.temperature_controlled,
      special_instructions: data.special_instructions,
      estimated_cost: data.estimated_cost,
      currency_code: data.currency_code,
      total_weight_kg: totalWeight,
      created_by: userId,
      status: 'DRAFT',
      // Create order lines
      order_lines: {
        create: data.shipment_lines.map(sl => ({
          shipment_line_id: sl.shipment_line_id,
          planned_bundle_qty: sl.planned_bundle_qty,
          planned_weight_kg: sl.planned_weight_kg,
        }))
      },
      // Create stops
      stops: {
        create: data.stops.map(stop => ({
          stop_sequence: stop.stop_sequence,
          stop_type: stop.stop_type,
          location_name: stop.location_name,
          location_code: stop.location_code,
          address: stop.address,
          city: stop.city,
          state_province: stop.state_province,
          postal_code: stop.postal_code,
          country_code: stop.country_code,
          contact_name: stop.contact_name,
          contact_phone: stop.contact_phone,
          scheduled_arrival: stop.scheduled_arrival ? new Date(stop.scheduled_arrival) : undefined,
          scheduled_departure: stop.scheduled_departure ? new Date(stop.scheduled_departure) : undefined,
        }))
      },
      // Create initial milestone
      milestones: {
        create: {
          milestone_type: 'BOOKING_CONFIRMED',
          description: 'Transport order created',
          reported_by: userId,
        }
      }
    },
    include: {
      order_lines: {
        include: {
          shipment_line: true,
        }
      },
      stops: {
        orderBy: { stop_sequence: 'asc' }
      },
      milestones: true,
    }
  });
  
  res.status(201).json({
    success: true,
    data: transportOrder,
  });
});

// PATCH /api/transport-orders/:id - Update transport order
router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const data = updateTransportOrderSchema.parse(req.body);
  
  const existing = await prisma.transportOrder.findUnique({
    where: { transport_order_id: id },
  });
  
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Transport order not found',
    });
  }
  
  // Only allow updates to DRAFT and BOOKED orders
  if (!['DRAFT', 'BOOKED'].includes(existing.status)) {
    return res.status(400).json({
      success: false,
      error: `Cannot update transport order with status: ${existing.status}`,
    });
  }
  
  const transportOrder = await prisma.transportOrder.update({
    where: { transport_order_id: id },
    data: {
      ...data,
      updated_at: new Date(),
    },
    include: {
      order_lines: {
        include: {
          shipment_line: true,
        }
      },
      stops: {
        orderBy: { stop_sequence: 'asc' }
      },
    }
  });
  
  res.json({
    success: true,
    data: transportOrder,
  });
});

// DELETE /api/transport-orders/:id - Delete transport order
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  const existing = await prisma.transportOrder.findUnique({
    where: { transport_order_id: id },
    include: {
      order_lines: {
        include: {
          bundle_allocations: true,
        }
      }
    }
  });
  
  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Transport order not found',
    });
  }
  
  // Only allow deletion of DRAFT orders
  if (existing.status !== 'DRAFT') {
    return res.status(400).json({
      success: false,
      error: 'Only DRAFT transport orders can be deleted',
    });
  }
  
  // Check if any bundles are allocated
  const hasAllocations = existing.order_lines.some(line => line.bundle_allocations.length > 0);
  if (hasAllocations) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete transport order with allocated bundles',
    });
  }
  
  await prisma.transportOrder.delete({
    where: { transport_order_id: id },
  });
  
  res.json({
    success: true,
    message: 'Transport order deleted successfully',
  });
});

// POST /api/transport-orders/:id/book - Book transport order
router.post('/:id/book', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { booking_reference } = req.body;
  
  const transportOrder = await prisma.transportOrder.update({
    where: {
      transport_order_id: id,
      status: 'DRAFT',
    },
    data: {
      status: 'BOOKED',
      booking_reference,
      milestones: {
        create: {
          milestone_type: 'BOOKING_CONFIRMED',
          description: `Booked with reference: ${booking_reference}`,
        }
      }
    },
    include: {
      order_lines: true,
      stops: true,
    }
  });
  
  res.json({
    success: true,
    data: transportOrder,
  });
});

export default router;