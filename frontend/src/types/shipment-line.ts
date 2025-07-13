export type ShipmentLineStatus = 'PLANNED' | 'READY' | 'PICKED' | 'SHIPPED' | 'DELIVERED'

export interface ShipmentLine {
  shipment_line_id: string
  call_off_id: string
  transport_order_id?: string
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
  status: ShipmentLineStatus
  created_at: string
  updated_at: string
}

export interface CreateShipmentLineRequest {
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
}

export interface UpdateShipmentLineRequest {
  bundle_qty?: number
  metal_code?: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
  status?: ShipmentLineStatus
}

export interface ShipmentLineFormData {
  bundle_qty: number
  metal_code: string
  destination_party_id?: string
  expected_ship_date?: string
  delivery_location?: string
  requested_delivery_date?: string
  notes?: string
}