// API wrapper for Railway backend

const RAILWAY_API = import.meta.env.VITE_API_URL || '';

export async function fetchQuotas() {
  const response = await fetch(`${RAILWAY_API}/quotas`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quotas: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}

export async function createCallOff(payload: any) {
  const response = await fetch(`${RAILWAY_API}/call-offs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Failed to create call-off: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}