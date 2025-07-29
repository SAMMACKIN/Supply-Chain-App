// Simple API wrapper that can use either Supabase or Railway

const RAILWAY_API = import.meta.env.VITE_API_URL;
const USE_RAILWAY = !!RAILWAY_API;

export async function fetchQuotas() {
  if (USE_RAILWAY) {
    const response = await fetch(`${RAILWAY_API}/quotas`);
    const data = await response.json();
    return data.data;
  } else {
    // Fallback to Supabase (current implementation)
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('quota')
      .select('*, counterparty:counterparty_id(company_name, company_code)');
    if (error) throw error;
    return data;
  }
}

export async function createCallOff(payload: any) {
  if (USE_RAILWAY) {
    const response = await fetch(`${RAILWAY_API}/call-offs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.data;
  } else {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('call_off')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}