
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Get auth token from Clerk
  const token = await window.Clerk?.session?.getToken();
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Request failed', data.details);
  }
  
  return data;
}

export const api = {
  // Auth endpoints
  auth: {
    me: () => fetchWithAuth('/auth/me'),
    updateProfile: (data: any) => fetchWithAuth('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },
  
  // Quota endpoints
  quotas: {
    list: (params?: {
      direction?: 'BUY' | 'SELL';
      month?: string;
      metal_code?: string;
      counterparty_id?: string;
      business_unit?: string;
    }) => {
      const searchParams = new URLSearchParams(params as any);
      return fetchWithAuth(`/quotas?${searchParams}`);
    },
    
    get: (id: string) => fetchWithAuth(`/quotas/${id}`),
    
    getCounterparties: () => fetchWithAuth('/quotas/filters/counterparties'),
  },
  
  // Call-off endpoints
  callOffs: {
    list: () => fetchWithAuth('/call-offs'),
    
    get: (id: string) => fetchWithAuth(`/call-offs/${id}`),
    
    create: (data: {
      quota_id: string;
      bundle_qty: number;
      requested_delivery_date?: string;
      delivery_address_id?: string;
    }) => fetchWithAuth('/call-offs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    update: (id: string, data: any) => fetchWithAuth(`/call-offs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    
    confirm: (id: string) => fetchWithAuth(`/call-offs/${id}/confirm`, {
      method: 'POST',
    }),
    
    cancel: (id: string) => fetchWithAuth(`/call-offs/${id}/cancel`, {
      method: 'POST',
    }),
    
    fulfill: (id: string) => fetchWithAuth(`/call-offs/${id}/fulfill`, {
      method: 'POST',
    }),
  },
  
  // Shipment line endpoints
  shipmentLines: {
    list: (callOffId: string) => 
      fetchWithAuth(`/call-offs/${callOffId}/shipment-lines`),
    
    create: (callOffId: string, data: {
      bundle_qty: number;
      metal_code: string;
      destination_party_id?: string;
      expected_ship_date?: string;
      delivery_location?: string;
      requested_delivery_date?: string;
      notes?: string;
    }) => fetchWithAuth(`/call-offs/${callOffId}/shipment-lines`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    update: (id: string, data: any) => fetchWithAuth(`/shipment-lines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    
    delete: (id: string) => fetchWithAuth(`/shipment-lines/${id}`, {
      method: 'DELETE',
    }),
  },
};

export const queryKeys = {
  quotas: {
    all: ['quotas'] as const,
    list: (params?: any) => ['quotas', 'list', params] as const,
    detail: (id: string) => ['quotas', 'detail', id] as const,
  },
  callOffs: {
    all: ['callOffs'] as const,
    list: () => ['callOffs', 'list'] as const,
    detail: (id: string) => ['callOffs', 'detail', id] as const,
  },
  shipmentLines: {
    list: (callOffId: string) => ['shipmentLines', callOffId] as const,
  },
};