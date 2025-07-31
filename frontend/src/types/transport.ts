// Transport Order Types

export type TransportMode = 'TRUCK' | 'RAIL' | 'VESSEL' | 'AIR' | 'MULTIMODAL';
export type TransportOrderStatus = 'DRAFT' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'EXCEPTION';
export type TransportStopType = 'PICKUP' | 'DELIVERY' | 'CROSS_DOCK' | 'CUSTOMS' | 'WEIGHBRIDGE';
export type TransportMilestoneType = 
  | 'BOOKING_CONFIRMED' 
  | 'PICKUP_SCHEDULED' 
  | 'ARRIVED_AT_PICKUP' 
  | 'DEPARTED_PICKUP'
  | 'IN_TRANSIT' 
  | 'ARRIVED_AT_DELIVERY' 
  | 'DELIVERED' 
  | 'POD_RECEIVED'
  | 'EXCEPTION' 
  | 'CUSTOMS_CLEARED' 
  | 'EQUIPMENT_RETURNED';
export type EquipmentType = 
  | 'CONTAINER_20FT' 
  | 'CONTAINER_40FT' 
  | 'CONTAINER_40HC'
  | 'FLATBED_TRAILER' 
  | 'ENCLOSED_TRAILER' 
  | 'RAIL_CAR'
  | 'TANK_CONTAINER' 
  | 'BULK_VESSEL';

export interface TransportOrder {
  transport_order_id: string;
  order_number: string;
  carrier_id?: string;
  carrier_name: string;
  booking_reference?: string;
  mode_of_transport: TransportMode;
  equipment_type?: EquipmentType;
  equipment_number?: string;
  status: TransportOrderStatus;
  total_weight_kg?: number;
  total_volume_m3?: number;
  dangerous_goods: boolean;
  temperature_controlled: boolean;
  special_instructions?: string;
  estimated_cost?: number;
  actual_cost?: number;
  currency_code?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  stops?: TransportStop[];
  milestones?: TransportMilestone[];
  order_lines?: TransportOrderLine[];
  documents?: TransportDocument[];
  _count?: {
    milestones: number;
    documents: number;
  };
}

export interface TransportOrderLine {
  transport_order_line_id: string;
  transport_order_id: string;
  shipment_line_id: string;
  
  // Planning fields
  planned_bundle_qty: number;
  planned_weight_kg?: number;
  
  // Actual loading fields
  actual_bundle_qty?: number;
  actual_weight_kg?: number;
  loaded_at?: string;
  loaded_by?: string;
  
  // Additional fields
  pallet_count?: number;
  volume_m3?: number;
  notes?: string;
  created_at: string;
  
  // Relations
  transport_order?: TransportOrder;
  shipment_line?: any; // Import from shipment-line types
  bundle_allocations?: TransportBundleAllocation[];
}

export interface TransportBundleAllocation {
  allocation_id: string;
  transport_order_line_id: string;
  bundle_id: string;
  loaded_weight_kg: number;
  loaded_at: string;
  unloaded_at?: string;
  
  // Relations
  transport_order_line?: TransportOrderLine;
  bundle?: any; // Import from inventory types
}

export interface TransportStop {
  transport_stop_id: string;
  transport_order_id: string;
  stop_sequence: number;
  stop_type: TransportStopType;
  location_name: string;
  location_code?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  contact_name?: string;
  contact_phone?: string;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  driver_name?: string;
  driver_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  transport_order?: TransportOrder;
  milestones?: TransportMilestone[];
}

export interface TransportMilestone {
  milestone_id: string;
  transport_order_id: string;
  transport_stop_id?: string;
  milestone_type: TransportMilestoneType;
  occurred_at: string;
  description?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  reported_by?: string;
  exception_code?: string;
  exception_reason?: string;
  resolution_required: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  
  // Relations
  transport_order?: TransportOrder;
  transport_stop?: TransportStop;
}

export interface TransportDocument {
  document_id: string;
  transport_order_id: string;
  document_type: string;
  document_number?: string;
  file_name: string;
  file_url?: string;
  file_size_bytes?: number;
  mime_type?: string;
  uploaded_by: string;
  uploaded_at: string;
  is_active: boolean;
  
  // Relations
  transport_order?: TransportOrder;
}

// Request types
export interface CreateTransportOrderRequest {
  carrier_name: string;
  mode_of_transport: TransportMode;
  equipment_type?: EquipmentType;
  equipment_number?: string;
  dangerous_goods?: boolean;
  temperature_controlled?: boolean;
  special_instructions?: string;
  estimated_cost?: number;
  currency_code?: string;
  shipment_lines: Array<{
    shipment_line_id: string;
    planned_bundle_qty: number;
    planned_weight_kg?: number;
  }>;
  stops: Array<{
    stop_sequence: number;
    stop_type: TransportStopType;
    location_name: string;
    location_code?: string;
    address?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country_code?: string;
    contact_name?: string;
    contact_phone?: string;
    scheduled_arrival?: string;
    scheduled_departure?: string;
  }>;
}

export interface UpdateTransportOrderRequest {
  carrier_name?: string;
  booking_reference?: string;
  equipment_number?: string;
  special_instructions?: string;
  estimated_cost?: number;
  actual_cost?: number;
  status?: TransportOrderStatus;
}