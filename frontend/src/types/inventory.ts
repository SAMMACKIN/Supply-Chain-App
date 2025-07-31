// Inventory Types

export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'IN_TRANSIT' | 'QUARANTINE' | 'DAMAGED' | 'DISPOSED';
export type AdjustmentType = 
  | 'WEIGHT_VARIANCE' 
  | 'DAMAGE' 
  | 'SPILLAGE' 
  | 'MOISTURE_LOSS'
  | 'REPACKAGING' 
  | 'QUALITY_ADJUSTMENT' 
  | 'CORRECTION';
export type DocumentType = 
  | 'CERTIFICATE_OF_ANALYSIS'
  | 'MILL_CERTIFICATE'
  | 'WEIGHT_CERTIFICATE'
  | 'QUALITY_CERTIFICATE'
  | 'INSPECTION_REPORT'
  | 'CUSTOMS_DOCUMENT'
  | 'OTHER';
export type LocationType = 'WAREHOUSE' | 'ZONE' | 'RACK' | 'YARD' | 'TRANSIT' | 'CUSTOMER';

export interface InventoryLocation {
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: LocationType;
  parent_location?: string;
  warehouse_code?: string;
  zone_code?: string;
  rack_position?: string;
  gps_coordinates?: {
    lat: number;
    lng: number;
  };
  capacity_tonnes?: number;
  is_active: boolean;
  temperature_controlled: boolean;
  security_level?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  parent?: InventoryLocation;
  child_locations?: InventoryLocation[];
  inventory_bundles?: InventoryBundle[];
  _count?: {
    inventory_bundles: number;
  };
}

export interface InventoryLot {
  lot_id: string;
  lot_number: string;
  metal_code: string;
  manufacturer_id?: string;
  manufacturer_lot_no?: string;
  production_date?: string;
  receipt_date: string;
  nominal_weight_t: number;
  actual_weight_t: number;
  purity_percentage?: number;
  chemical_composition?: Record<string, any>;
  origin_country?: string;
  customs_cleared: boolean;
  quarantine_status: boolean;
  quarantine_reason?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  bundles?: InventoryBundle[];
  certificates?: InventoryCertificate[];
  _count?: {
    bundles: number;
  };
}

export interface InventoryBundle {
  bundle_id: string;
  bundle_number: string;
  lot_id: string;
  sequence_in_lot: number;
  metal_code: string;
  nominal_weight_kg: number;
  actual_weight_kg: number;
  tare_weight_kg?: number;
  net_weight_kg?: number;
  location_id: string;
  status: InventoryStatus;
  reserved_for?: string;
  reservation_date?: string;
  last_movement_date?: string;
  seal_number?: string;
  container_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  lot?: InventoryLot;
  location?: InventoryLocation;
  adjustments?: InventoryAdjustment[];
  movements?: InventoryMovement[];
  transport_allocations?: any[]; // Import from transport types
  _count?: {
    adjustments: number;
    movements: number;
  };
}

export interface InventoryAdjustment {
  adjustment_id: string;
  bundle_id: string;
  adjustment_type: AdjustmentType;
  adjustment_date: string;
  weight_before_kg: number;
  weight_after_kg: number;
  weight_variance_kg: number;
  reason: string;
  reference_document?: string;
  approved_by?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  
  // Relations
  bundle?: InventoryBundle;
}

export interface InventoryMovement {
  movement_id: string;
  bundle_id: string;
  movement_type: string;
  from_location_id?: string;
  to_location_id?: string;
  movement_date: string;
  reference_type?: string;
  reference_id?: string;
  performed_by: string;
  notes?: string;
  created_at: string;
  
  // Relations
  bundle?: InventoryBundle;
}

export interface InventoryCertificate {
  certificate_id: string;
  document_type: DocumentType;
  document_number: string;
  lot_id?: string;
  bundle_id?: string;
  issuer_name: string;
  issue_date: string;
  expiry_date?: string;
  file_path?: string;
  file_hash?: string;
  certificate_data?: Record<string, any>;
  verified: boolean;
  verified_by?: string;
  verified_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  lot?: InventoryLot;
}

// Summary types
export interface InventorySummary {
  metal_code: string;
  location_id: string;
  total_bundles: number;
  total_weight_kg: number;
  status_breakdown: {
    [key in InventoryStatus]?: {
      count: number;
      weight_kg: number;
    };
  };
}

// Request types
export interface CreateInventoryLocationRequest {
  location_code: string;
  location_name: string;
  location_type: LocationType;
  parent_location?: string;
  warehouse_code?: string;
  zone_code?: string;
  rack_position?: string;
  capacity_tonnes?: number;
  temperature_controlled?: boolean;
  security_level?: string;
  notes?: string;
}

export interface CreateInventoryLotRequest {
  lot_number: string;
  metal_code: string;
  manufacturer_id?: string;
  manufacturer_lot_no?: string;
  production_date?: string;
  receipt_date: string;
  actual_weight_t: number;
  purity_percentage?: number;
  chemical_composition?: Record<string, any>;
  origin_country?: string;
  customs_cleared?: boolean;
  location_id: string;
  create_bundles?: boolean;
}

export interface CreateInventoryAdjustmentRequest {
  bundle_id: string;
  adjustment_type: AdjustmentType;
  weight_after_kg: number;
  reason: string;
  reference_document?: string;
  notes?: string;
}