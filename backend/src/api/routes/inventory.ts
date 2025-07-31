import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const createInventoryLocationSchema = z.object({
  location_code: z.string().min(1).max(50),
  location_name: z.string().min(1).max(255),
  location_type: z.enum(['WAREHOUSE', 'ZONE', 'RACK', 'YARD', 'TRANSIT', 'CUSTOMER']),
  parent_location: z.string().uuid().optional(),
  warehouse_code: z.string().optional(),
  zone_code: z.string().optional(),
  rack_position: z.string().optional(),
  capacity_tonnes: z.number().optional(),
  temperature_controlled: z.boolean().optional().default(false),
  security_level: z.string().optional(),
  notes: z.string().optional(),
});

const createInventoryLotSchema = z.object({
  lot_number: z.string().min(1).max(50),
  metal_code: z.string().max(12),
  manufacturer_id: z.string().uuid().optional(),
  manufacturer_lot_no: z.string().optional(),
  production_date: z.string().datetime().optional(),
  receipt_date: z.string().datetime(),
  actual_weight_t: z.number().min(0),
  purity_percentage: z.number().min(0).max(100).optional(),
  chemical_composition: z.object({}).passthrough().optional(),
  origin_country: z.string().length(2).optional(),
  customs_cleared: z.boolean().optional().default(false),
  location_id: z.string().uuid(),
  create_bundles: z.boolean().optional().default(true),
});

const createInventoryAdjustmentSchema = z.object({
  bundle_id: z.string().uuid(),
  adjustment_type: z.enum([
    'WEIGHT_VARIANCE', 'DAMAGE', 'SPILLAGE', 'MOISTURE_LOSS',
    'REPACKAGING', 'QUALITY_ADJUSTMENT', 'CORRECTION'
  ]),
  weight_after_kg: z.number(),
  reason: z.string(),
  reference_document: z.string().optional(),
  notes: z.string().optional(),
});

// Helper function to generate bundle numbers
function generateBundleNumbers(lotNumber: string, count: number): string[] {
  const bundles: string[] = [];
  for (let i = 1; i <= count; i++) {
    bundles.push(`${lotNumber}-${String(i).padStart(2, '0')}`);
  }
  return bundles;
}

// GET /api/inventory/locations - List inventory locations
router.get('/locations', requireAuth, async (req, res) => {
  const { warehouse_code, location_type, parent_location } = req.query;
  
  const where: any = { is_active: true };
  if (warehouse_code) where.warehouse_code = warehouse_code as string;
  if (location_type) where.location_type = location_type as string;
  if (parent_location) where.parent_location = parent_location as string;
  
  const locations = await prisma.inventoryLocation.findMany({
    where,
    include: {
      child_locations: {
        where: { is_active: true }
      },
      _count: {
        select: {
          inventory_bundles: true,
        }
      }
    },
    orderBy: [
      { warehouse_code: 'asc' },
      { zone_code: 'asc' },
      { rack_position: 'asc' }
    ],
  });
  
  res.json({
    success: true,
    data: locations,
    count: locations.length,
  });
});

// POST /api/inventory/locations - Create inventory location
router.post('/locations', requireAuth, async (req, res): Promise<void> => {
  const data = createInventoryLocationSchema.parse(req.body);
  
  // Check if location code already exists
  const existing = await prisma.inventoryLocation.findUnique({
    where: { location_code: data.location_code },
  });
  
  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'Location code already exists',
    });
  }
  
  const location = await prisma.inventoryLocation.create({
    data,
  });
  
  res.status(201).json({
    success: true,
    data: location,
  });
});

// GET /api/inventory/lots - List inventory lots
router.get('/lots', requireAuth, async (req, res) => {
  const { metal_code, manufacturer_id, customs_cleared, quarantine_status } = req.query;
  
  const where: any = {};
  if (metal_code) where.metal_code = metal_code as string;
  if (manufacturer_id) where.manufacturer_id = manufacturer_id as string;
  if (customs_cleared !== undefined) where.customs_cleared = customs_cleared === 'true';
  if (quarantine_status !== undefined) where.quarantine_status = quarantine_status === 'true';
  
  const lots = await prisma.inventoryLot.findMany({
    where,
    include: {
      bundles: {
        include: {
          _count: {
            select: {
              adjustments: true,
              movements: true,
            }
          }
        }
      },
      certificates: {
        where: { verified: true }
      },
      _count: {
        select: {
          bundles: true,
        }
      }
    },
    orderBy: { receipt_date: 'desc' },
  });
  
  res.json({
    success: true,
    data: lots,
    count: lots.length,
  });
});

// GET /api/inventory/lots/:id - Get single lot with bundles
router.get('/lots/:id', requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  
  const lot = await prisma.inventoryLot.findUnique({
    where: { lot_id: id },
    include: {
      bundles: {
        include: {
          location: true,
          adjustments: {
            orderBy: { adjustment_date: 'desc' },
            take: 5,
          },
          movements: {
            orderBy: { movement_date: 'desc' },
            take: 5,
          },
          transport_allocations: {
            include: {
              transport_order_line: {
                include: {
                  transport_order: true,
                }
              }
            }
          }
        },
        orderBy: { sequence_in_lot: 'asc' },
      },
      certificates: true,
    }
  });
  
  if (!lot) {
    return res.status(404).json({
      success: false,
      error: 'Lot not found',
    });
  }
  
  res.json({
    success: true,
    data: lot,
  });
});

// POST /api/inventory/lots - Create inventory lot with bundles
router.post('/lots', requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth?.userId || '00000000-0000-0000-0000-000000000000';
  const data = createInventoryLotSchema.parse(req.body);
  
  // Check if lot number already exists
  const existing = await prisma.inventoryLot.findUnique({
    where: { lot_number: data.lot_number },
  });
  
  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'Lot number already exists',
    });
  }
  
  // Validate location exists
  const location = await prisma.inventoryLocation.findUnique({
    where: { location_id: data.location_id },
  });
  
  if (!location) {
    return res.status(400).json({
      success: false,
      error: 'Invalid location',
    });
  }
  
  // Calculate bundle count (25 bundles per lot)
  const bundleCount = 25;
  const nominalBundleWeight = 1000; // 1 tonne per bundle
  const actualBundleWeight = (data.actual_weight_t * 1000) / bundleCount; // Convert to kg and divide
  
  // Generate bundle numbers
  const bundleNumbers = generateBundleNumbers(data.lot_number, bundleCount);
  
  // Create lot with bundles
  const lot = await prisma.inventoryLot.create({
    data: {
      lot_number: data.lot_number,
      metal_code: data.metal_code,
      manufacturer_id: data.manufacturer_id,
      manufacturer_lot_no: data.manufacturer_lot_no,
      production_date: data.production_date ? new Date(data.production_date) : undefined,
      receipt_date: new Date(data.receipt_date),
      nominal_weight_t: 25.000,
      actual_weight_t: data.actual_weight_t,
      purity_percentage: data.purity_percentage,
      chemical_composition: data.chemical_composition,
      origin_country: data.origin_country,
      customs_cleared: data.customs_cleared,
      // Create bundles if requested
      bundles: data.create_bundles ? {
        create: bundleNumbers.map((bundleNumber, index) => ({
          bundle_number: bundleNumber,
          sequence_in_lot: index + 1,
          metal_code: data.metal_code,
          nominal_weight_kg: nominalBundleWeight,
          actual_weight_kg: actualBundleWeight,
          location_id: data.location_id,
          status: 'AVAILABLE',
          // Create initial movement record
          movements: {
            create: {
              movement_type: 'RECEIPT',
              to_location_id: data.location_id,
              performed_by: userId,
              notes: `Initial receipt from lot ${data.lot_number}`,
            }
          }
        }))
      } : undefined,
    },
    include: {
      bundles: {
        include: {
          location: true,
        }
      },
    }
  });
  
  res.status(201).json({
    success: true,
    data: lot,
  });
});

// GET /api/inventory/bundles - List inventory bundles
router.get('/bundles', requireAuth, async (req, res) => {
  const { metal_code, status, location_id, lot_id, available_only } = req.query;
  
  const where: any = {};
  if (metal_code) where.metal_code = metal_code as string;
  if (status) where.status = status as string;
  if (location_id) where.location_id = location_id as string;
  if (lot_id) where.lot_id = lot_id as string;
  if (available_only === 'true') {
    where.status = 'AVAILABLE';
    where.reserved_for = null;
  }
  
  const bundles = await prisma.inventoryBundle.findMany({
    where,
    include: {
      lot: {
        select: {
          lot_number: true,
          purity_percentage: true,
          manufacturer_id: true,
        }
      },
      location: true,
      transport_allocations: {
        include: {
          transport_order_line: {
            include: {
              transport_order: {
                select: {
                  order_number: true,
                  status: true,
                }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { lot_id: 'asc' },
      { sequence_in_lot: 'asc' }
    ],
  });
  
  res.json({
    success: true,
    data: bundles,
    count: bundles.length,
  });
});

// POST /api/inventory/adjustments - Create inventory adjustment
router.post('/adjustments', requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth?.userId || '00000000-0000-0000-0000-000000000000';
  const data = createInventoryAdjustmentSchema.parse(req.body);
  
  // Get current bundle weight
  const bundle = await prisma.inventoryBundle.findUnique({
    where: { bundle_id: data.bundle_id },
  });
  
  if (!bundle) {
    return res.status(404).json({
      success: false,
      error: 'Bundle not found',
    });
  }
  
  const weightVariance = data.weight_after_kg - bundle.actual_weight_kg.toNumber();
  
  // Create adjustment and update bundle in transaction
  const [adjustment] = await prisma.$transaction([
    // Create adjustment record
    prisma.inventoryAdjustment.create({
      data: {
        bundle_id: data.bundle_id,
        adjustment_type: data.adjustment_type,
        weight_before_kg: bundle.actual_weight_kg,
        weight_after_kg: data.weight_after_kg,
        weight_variance_kg: weightVariance,
        reason: data.reason,
        reference_document: data.reference_document,
        notes: data.notes,
        created_by: userId,
      }
    }),
    // Update bundle weight
    prisma.inventoryBundle.update({
      where: { bundle_id: data.bundle_id },
      data: {
        actual_weight_kg: data.weight_after_kg,
        net_weight_kg: bundle.tare_weight_kg ? 
          data.weight_after_kg - bundle.tare_weight_kg.toNumber() : 
          data.weight_after_kg,
      }
    }),
    // Create movement record
    prisma.inventoryMovement.create({
      data: {
        bundle_id: data.bundle_id,
        movement_type: 'ADJUSTMENT',
        from_location_id: bundle.location_id,
        to_location_id: bundle.location_id,
        reference_type: 'ADJUSTMENT',
        performed_by: userId,
        notes: `Weight adjustment: ${data.adjustment_type} - ${data.reason}`,
      }
    })
  ]);
  
  res.status(201).json({
    success: true,
    data: adjustment,
  });
});

// GET /api/inventory/summary - Get inventory summary by location and metal
router.get('/summary', requireAuth, async (req, res) => {
  const { location_id, metal_code } = req.query;
  
  const summary = await prisma.inventoryBundle.groupBy({
    by: ['metal_code', 'location_id', 'status'],
    where: {
      ...(location_id && { location_id: location_id as string }),
      ...(metal_code && { metal_code: metal_code as string }),
    },
    _count: {
      bundle_id: true,
    },
    _sum: {
      actual_weight_kg: true,
    }
  });
  
  // Transform the data for better usability
  const transformedSummary = summary.reduce((acc: any[], item) => {
    const existing = acc.find(s => 
      s.metal_code === item.metal_code && s.location_id === item.location_id
    );
    
    if (existing) {
      existing.status_breakdown[item.status] = {
        count: item._count.bundle_id,
        weight_kg: item._sum.actual_weight_kg?.toNumber() || 0,
      };
      existing.total_bundles += item._count.bundle_id;
      existing.total_weight_kg += item._sum.actual_weight_kg?.toNumber() || 0;
    } else {
      acc.push({
        metal_code: item.metal_code,
        location_id: item.location_id,
        total_bundles: item._count.bundle_id,
        total_weight_kg: item._sum.actual_weight_kg?.toNumber() || 0,
        status_breakdown: {
          [item.status]: {
            count: item._count.bundle_id,
            weight_kg: item._sum.actual_weight_kg?.toNumber() || 0,
          }
        }
      });
    }
    
    return acc;
  }, []);
  
  res.json({
    success: true,
    data: transformedSummary,
  });
});

export default router;