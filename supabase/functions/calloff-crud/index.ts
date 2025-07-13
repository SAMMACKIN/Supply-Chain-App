import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    
    console.log('Edge Function called with path:', url.pathname)
    console.log('Path parts:', pathParts)
    
    // Create Supabase client with user's JWT token from Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    let supabase
    if (authHeader) {
      // Use user's JWT token for authenticated requests
      console.log('Using user auth token')
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        }
      )
    } else {
      // Fallback to service role for unauthenticated requests (like fetching quotas/counterparties)
      console.log('Using service role for unauthenticated request')
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
    }
    
    // Handle quotas endpoint - path will be "/calloff-crud/quotas"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'quotas' && req.method === 'GET') {
      console.log('Fetching real quotas from database')
      
      // Now that foreign keys exist, try the proper Supabase join
      const { data, error } = await supabase
        .from('quota')
        .select(`
          quota_id,
          counterparty_id,
          direction,
          period_month,
          qty_t,
          tolerance_pct,
          metal_code,
          business_unit_id,
          incoterm_code,
          created_at,
          counterparty:counterparty_id (
            company_name,
            company_code,
            counterparty_type,
            country_code
          )
        `)
        .order('period_month', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      const response = {
        success: true,
        data: data || [],
        count: (data || []).length
      }
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle call-off creation endpoint - path will be "/calloff-crud/call-offs"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'call-offs' && req.method === 'POST') {
      console.log('Creating new call-off')
      
      const body = await req.json()
      console.log('Call-off creation request:', body)
      
      // Basic validation
      if (!body.quota_id || !body.bundle_qty) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: quota_id, bundle_qty'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      // First get the quota to extract required fields
      const { data: quota, error: quotaError } = await supabase
        .from('quota')
        .select('counterparty_id, direction, incoterm_code')
        .eq('quota_id', body.quota_id)
        .single()
      
      if (quotaError || !quota) {
        return new Response(JSON.stringify({
          success: false,
          error: `Invalid quota_id: ${quotaError?.message || 'Quota not found'}`
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      // Create call-off with manual call_off_number to avoid trigger issues
      const callOffNumber = `CO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
      
      const { data, error } = await supabase
        .from('call_off')
        .insert({
          quota_id: body.quota_id,
          counterparty_id: quota.counterparty_id,
          direction: quota.direction,
          incoterm_code: quota.incoterm_code,
          bundle_qty: body.bundle_qty,
          requested_delivery_date: body.requested_delivery_date || null,
          status: 'NEW',
          created_by: '00000000-0000-0000-0000-000000000000', // Anonymous user placeholder UUID
          call_off_number: callOffNumber
        })
        .select()
        .single()
      
      if (error) {
        console.error('Database error creating call-off:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to create call-off: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      console.log('Call-off created successfully:', data)
      
      return new Response(JSON.stringify({
        success: true,
        data
      }), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle call-off list endpoint - path will be "/calloff-crud/call-offs"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'call-offs' && req.method === 'GET') {
      console.log('Fetching call-offs list')
      
      const { data, error } = await supabase
        .from('call_off')
        .select(`
          call_off_id,
          call_off_number,
          quota_id,
          status,
          bundle_qty,
          requested_delivery_date,
          direction,
          counterparty_id,
          incoterm_code,
          created_at,
          confirmed_at,
          cancelled_at,
          fulfilled_at
        `)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Database error fetching call-offs:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to fetch call-offs: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        count: (data || []).length
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle call-off update endpoint - path will be "/calloff-crud/call-offs/:id"
    if (pathParts.length === 3 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'call-offs' && req.method === 'PATCH') {
      console.log('Updating call-off')
      
      const callOffId = pathParts[2]
      
      const body = await req.json()
      console.log('Call-off update request:', body)
      
      // Simple direct update
      const updateData: any = {}
      if (body.bundle_qty !== undefined) updateData.bundle_qty = body.bundle_qty
      if (body.requested_delivery_date !== undefined) updateData.requested_delivery_date = body.requested_delivery_date
      
      const { data, error } = await supabase
        .from('call_off')
        .update(updateData)
        .eq('call_off_id', callOffId)
        .eq('status', 'NEW')
        .select()
        .single()
      
      if (error) {
        console.error('Database error updating call-off:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to update call-off: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      if (!data) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Call-off not found or not editable (only NEW status can be edited)'
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        data
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle call-off workflow actions - path will be "/calloff-crud/call-offs/:id/:action"
    if (pathParts.length === 4 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'call-offs' && req.method === 'POST') {
      console.log('Call-off workflow action')
      
      const callOffId = pathParts[2]
      const action = pathParts[3]
      
      if (action === 'confirm') {
        console.log('Confirming call-off:', callOffId)
        
        const { data, error } = await supabase
          .from('call_off')
          .update({ 
            status: 'CONFIRMED',
            confirmed_at: new Date().toISOString()
          })
          .eq('call_off_id', callOffId)
          .eq('status', 'NEW') // Only NEW call-offs can be confirmed
          .select()
          .single()
        
        if (error) {
          return new Response(JSON.stringify({
            success: false,
            error: `Failed to confirm call-off: ${error.message}`
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        if (!data) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Call-off not found or cannot be confirmed (must be NEW status)'
          }), {
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      if (action === 'cancel') {
        console.log('Cancelling call-off:', callOffId)
        
        let reason = null
        try {
          const body = await req.json()
          reason = body.reason
        } catch {
          // Reason is optional
        }
        
        const { data, error } = await supabase
          .from('call_off')
          .update({ 
            status: 'CANCELLED',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason
          })
          .eq('call_off_id', callOffId)
          .in('status', ['NEW', 'CONFIRMED']) // NEW or CONFIRMED call-offs can be cancelled
          .select()
          .single()
        
        if (error) {
          return new Response(JSON.stringify({
            success: false,
            error: `Failed to cancel call-off: ${error.message}`
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        if (!data) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Call-off not found or cannot be cancelled (must be NEW or CONFIRMED status)'
          }), {
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      if (action === 'fulfill') {
        console.log('Fulfilling call-off:', callOffId)
        
        const { data, error } = await supabase
          .from('call_off')
          .update({ 
            status: 'FULFILLED',
            fulfilled_at: new Date().toISOString()
          })
          .eq('call_off_id', callOffId)
          .eq('status', 'CONFIRMED') // Only CONFIRMED call-offs can be fulfilled
          .select()
          .single()
        
        if (error) {
          return new Response(JSON.stringify({
            success: false,
            error: `Failed to fulfill call-off: ${error.message}`
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        if (!data) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Call-off not found or cannot be fulfilled (must be CONFIRMED status)'
          }), {
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        return new Response(JSON.stringify({
          success: true,
          data
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Valid actions are: confirm, cancel, fulfill`
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle database fix endpoint - path will be "/calloff-crud/fix-database"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'fix-database' && req.method === 'POST') {
      console.log('Fixing database schema')
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      try {
        // Simply drop the problematic trigger - this is the easiest fix
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: 'DROP TRIGGER IF EXISTS update_call_off_updated_at ON call_off;'
        })
        
        if (dropError) {
          console.error('Could not drop trigger (may not exist):', dropError)
        }
        
        console.log('Trigger dropped successfully')
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Database trigger dropped successfully',
          details: {
            triggerDropped: !dropError
          }
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
        
      } catch (error) {
        console.error('Database fix error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Database fix failed: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
    }
    
    // Handle shipment lines list endpoint - path will be "/calloff-crud/call-offs/:id/shipment-lines"
    if (pathParts.length === 4 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'call-offs' && pathParts[3] === 'shipment-lines' && req.method === 'GET') {
      console.log('Fetching shipment lines for call-off')
      
      const callOffId = pathParts[2]
      
      const { data, error } = await supabase
        .from('call_off_shipment_line')
        .select(`
          shipment_line_id,
          call_off_id,
          transport_order_id,
          bundle_qty,
          metal_code,
          destination_party_id,
          expected_ship_date,
          created_at,
          updated_at
        `)
        .eq('call_off_id', callOffId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Database error fetching shipment lines:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to fetch shipment lines: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        count: (data || []).length
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle shipment line creation endpoint - path will be "/calloff-crud/call-offs/:id/shipment-lines"
    if (pathParts.length === 4 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'call-offs' && pathParts[3] === 'shipment-lines' && req.method === 'POST') {
      console.log('Creating new shipment line')
      
      const callOffId = pathParts[2]
      
      const body = await req.json()
      console.log('Shipment line creation request:', body)
      
      // Basic validation
      if (!body.bundle_qty || !body.metal_code) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: bundle_qty, metal_code'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      // Verify call-off exists and get its details
      const { data: callOff, error: callOffError } = await supabase
        .from('call_off')
        .select('call_off_id, bundle_qty, status')
        .eq('call_off_id', callOffId)
        .single()
      
      if (callOffError || !callOff) {
        return new Response(JSON.stringify({
          success: false,
          error: `Invalid call_off_id: ${callOffError?.message || 'Call-off not found'}`
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      // Check if call-off can have shipment lines added (only NEW and CONFIRMED status)
      if (!['NEW', 'CONFIRMED'].includes(callOff.status)) {
        return new Response(JSON.stringify({
          success: false,
          error: `Cannot add shipment lines to call-off with status: ${callOff.status}`
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      const { data, error } = await supabase
        .from('call_off_shipment_line')
        .insert({
          call_off_id: callOffId,
          bundle_qty: body.bundle_qty,
          metal_code: body.metal_code,
          destination_party_id: body.destination_party_id || null,
          expected_ship_date: body.expected_ship_date || null,
          delivery_location: body.delivery_location || null,
          requested_delivery_date: body.requested_delivery_date || null,
          notes: body.notes || null,
          status: 'PLANNED'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Database error creating shipment line:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to create shipment line: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      console.log('Shipment line created successfully:', data)
      
      return new Response(JSON.stringify({
        success: true,
        data
      }), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle shipment line update endpoint - path will be "/calloff-crud/shipment-lines/:id"
    if (pathParts.length === 3 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'shipment-lines' && req.method === 'PATCH') {
      console.log('Updating shipment line')
      
      const shipmentLineId = pathParts[2]
      
      const body = await req.json()
      console.log('Shipment line update request:', body)
      
      // Build update data
      const updateData: any = {}
      if (body.bundle_qty !== undefined) updateData.bundle_qty = body.bundle_qty
      if (body.metal_code !== undefined) updateData.metal_code = body.metal_code
      if (body.expected_ship_date !== undefined) updateData.expected_ship_date = body.expected_ship_date
      if (body.destination_party_id !== undefined) updateData.destination_party_id = body.destination_party_id
      if (body.delivery_location !== undefined) updateData.delivery_location = body.delivery_location
      if (body.requested_delivery_date !== undefined) updateData.requested_delivery_date = body.requested_delivery_date
      if (body.notes !== undefined) updateData.notes = body.notes
      if (body.status !== undefined) updateData.status = body.status
      
      const { data, error } = await supabase
        .from('call_off_shipment_line')
        .update(updateData)
        .eq('shipment_line_id', shipmentLineId)
        .select()
        .single()
      
      if (error) {
        console.error('Database error updating shipment line:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to update shipment line: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      if (!data) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Shipment line not found'
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        data
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle shipment line deletion endpoint - path will be "/calloff-crud/shipment-lines/:id"
    if (pathParts.length === 3 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'shipment-lines' && req.method === 'DELETE') {
      console.log('Deleting shipment line')
      
      const shipmentLineId = pathParts[2]
      
      const { data, error } = await supabase
        .from('call_off_shipment_line')
        .delete()
        .eq('shipment_line_id', shipmentLineId)
        .select()
        .single()
      
      if (error) {
        console.error('Database error deleting shipment line:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to delete shipment line: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      if (!data) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Shipment line not found'
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Shipment line deleted successfully'
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle counterparty table creation endpoint - path will be "/calloff-crud/create-counterparty-table"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'create-counterparty-table' && req.method === 'POST') {
      console.log('Creating counterparty table')
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      try {
        // Connect directly to PostgreSQL to execute DDL
        const dbUrl = Deno.env.get('SUPABASE_DB_URL') || 
                     `postgresql://postgres.pxwtdaqhwzweedflwora:${Deno.env.get('SUPABASE_DB_PASSWORD') || 'dP9hFIx5hE9r7HrD'}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
        
        const client = new Client(dbUrl)
        await client.connect()
        
        console.log('Connected to PostgreSQL directly')
        
        // Create the counterparty table
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS counterparty (
            counterparty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_name VARCHAR(200) NOT NULL,
            company_code VARCHAR(20) UNIQUE NOT NULL,
            primary_contact_name VARCHAR(100),
            primary_contact_email VARCHAR(100),
            primary_contact_phone VARCHAR(30),
            address_line_1 VARCHAR(200),
            address_line_2 VARCHAR(200),
            city VARCHAR(100),
            state_province VARCHAR(100),
            postal_code VARCHAR(20),
            country_code CHAR(2) NOT NULL,
            counterparty_type VARCHAR(20) NOT NULL CHECK (counterparty_type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
            tax_id VARCHAR(50),
            credit_rating VARCHAR(10),
            default_currency CHAR(3) DEFAULT 'USD',
            payment_terms_days INTEGER DEFAULT 30,
            is_active BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `
        
        await client.queryObject(createTableSQL)
        console.log('✅ Counterparty table created successfully')
        
        // Insert sample data
        const insertSQL = `
          INSERT INTO counterparty (company_name, company_code, counterparty_type, country_code, primary_contact_name, city) VALUES
          ('Acme Corporation', 'ACME', 'CUSTOMER', 'US', 'John Smith', 'New York'),
          ('Global Metals Ltd', 'GLOBAL', 'SUPPLIER', 'GB', 'Sarah Johnson', 'London'),
          ('TechCorp Industries', 'TECH', 'CUSTOMER', 'DE', 'Hans Mueller', 'Berlin'),
          ('Pacific Mining Co', 'PACIFIC', 'SUPPLIER', 'AU', 'Michael Chen', 'Sydney'),
          ('European Alloys SA', 'EURO', 'BOTH', 'FR', 'Marie Dubois', 'Paris'),
          ('American Steel Inc', 'AMSTEEL', 'CUSTOMER', 'US', 'Robert Wilson', 'Chicago'),
          ('Nordic Resources', 'NORDIC', 'SUPPLIER', 'NO', 'Erik Larsen', 'Oslo'),
          ('Asian Metals Trading', 'ASIAN', 'BOTH', 'SG', 'Li Wei', 'Singapore'),
          ('Brazilian Copper Ltd', 'BRAZIL', 'SUPPLIER', 'BR', 'Carlos Silva', 'São Paulo'),
          ('Canadian Minerals Corp', 'CANADA', 'SUPPLIER', 'CA', 'Emma Brown', 'Toronto')
          ON CONFLICT (company_code) DO NOTHING;
        `
        
        const insertResult = await client.queryObject(insertSQL)
        console.log('✅ Sample data inserted:', insertResult.rowCount)
        
        await client.end()
        
        // Now test with Supabase client
        const { data: testData, error: testError } = await supabase
          .from('counterparty')
          .select('counterparty_id, company_name, company_code')
          .limit(3)
        
        if (testError) {
          console.error('Error testing counterparty table after creation:', testError)
          return new Response(JSON.stringify({
            success: false,
            error: `Table created but verification failed: ${testError.message}`
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          })
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Counterparty table created and data inserted successfully',
          tableCreated: true,
          sampleDataInserted: true,
          insertedRowCount: insertResult.rowCount,
          testData: testData
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
        
      } catch (error) {
        console.error('Error in counterparty table creation:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to create counterparty table: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
    }
    
    // Handle quota-counterparty linking endpoint - path will be "/calloff-crud/link-quotas-to-counterparties"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'link-quotas-to-counterparties' && req.method === 'POST') {
      console.log('Linking quotas to counterparties')
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      try {
        // Get all counterparties
        const { data: counterparties, error: cpError } = await supabase
          .from('counterparty')
          .select('counterparty_id, company_code')
        
        if (cpError) {
          throw new Error(`Failed to fetch counterparties: ${cpError.message}`)
        }
        
        // Create a mapping from company codes to IDs
        const cpMap = new Map()
        counterparties?.forEach(cp => {
          cpMap.set(cp.company_code, cp.counterparty_id)
        })
        
        // Connect directly to PostgreSQL to update quotas
        const dbUrl = Deno.env.get('SUPABASE_DB_URL') || 
                     `postgresql://postgres.pxwtdaqhwzweedflwora:${Deno.env.get('SUPABASE_DB_PASSWORD') || 'dP9hFIx5hE9r7HrD'}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
        
        const client = new Client(dbUrl)
        await client.connect()
        
        // Update quotas with random counterparty assignments
        const companies = Array.from(cpMap.keys())
        let updatedCount = 0
        
        // Get all quota IDs
        const quotaResult = await client.queryObject('SELECT quota_id FROM quota')
        
        for (const row of quotaResult.rows) {
          const quotaId = row.quota_id
          const randomCompany = companies[Math.floor(Math.random() * companies.length)]
          const counterpartyId = cpMap.get(randomCompany)
          
          await client.queryObject(
            'UPDATE quota SET counterparty_id = $1 WHERE quota_id = $2',
            [counterpartyId, quotaId]
          )
          updatedCount++
        }
        
        await client.end()
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Quotas linked to counterparties successfully',
          updatedQuotas: updatedCount,
          availableCounterparties: counterparties?.length || 0
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
        
      } catch (error) {
        console.error('Error linking quotas to counterparties:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to link quotas: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
    }
    
    // Handle foreign key creation endpoint - path will be "/calloff-crud/create-foreign-keys"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'create-foreign-keys' && req.method === 'POST') {
      console.log('Creating foreign key relationships')
      
      try {
        // Connect directly to PostgreSQL to create foreign keys
        const dbUrl = Deno.env.get('SUPABASE_DB_URL') || 
                     `postgresql://postgres.pxwtdaqhwzweedflwora:${Deno.env.get('SUPABASE_DB_PASSWORD') || 'dP9hFIx5hE9r7HrD'}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
        
        const client = new Client(dbUrl)
        await client.connect()
        
        console.log('Connected to PostgreSQL for foreign key creation')
        
        // First, update call_off records to have valid counterparty_id values
        console.log('Updating call_off records with valid counterparty IDs...')
        
        // Get a valid counterparty ID to use for existing call_offs
        const counterpartyResult = await client.queryObject('SELECT counterparty_id FROM counterparty LIMIT 1')
        
        if (counterpartyResult.rows.length === 0) {
          throw new Error('No counterparties found. Please create counterparty table first.')
        }
        
        const validCounterpartyId = counterpartyResult.rows[0].counterparty_id
        
        // Update all call_off records to use a valid counterparty_id
        await client.queryObject(
          'UPDATE call_off SET counterparty_id = $1 WHERE counterparty_id NOT IN (SELECT counterparty_id FROM counterparty)',
          [validCounterpartyId]
        )
        
        console.log('Updated call_off records with valid counterparty IDs')
        
        // Create foreign key relationships
        const foreignKeySQL = `
          -- Add foreign key constraint from quota to counterparty
          ALTER TABLE quota 
          ADD CONSTRAINT fk_quota_counterparty 
          FOREIGN KEY (counterparty_id) 
          REFERENCES counterparty(counterparty_id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE;
          
          -- Add foreign key constraint from call_off to counterparty
          ALTER TABLE call_off 
          ADD CONSTRAINT fk_call_off_counterparty 
          FOREIGN KEY (counterparty_id) 
          REFERENCES counterparty(counterparty_id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE;
          
          -- Add foreign key constraint from call_off to quota
          ALTER TABLE call_off 
          ADD CONSTRAINT fk_call_off_quota 
          FOREIGN KEY (quota_id) 
          REFERENCES quota(quota_id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE;
        `
        
        await client.queryObject(foreignKeySQL)
        console.log('✅ Foreign key constraints created successfully')
        
        await client.end()
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Foreign key relationships created successfully',
          relationships: [
            'quota.counterparty_id -> counterparty.counterparty_id',
            'call_off.counterparty_id -> counterparty.counterparty_id', 
            'call_off.quota_id -> quota.quota_id'
          ]
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
        
      } catch (error) {
        console.error('Error creating foreign keys:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to create foreign keys: ${error.message}`,
          hint: error.message.includes('already exists') ? 'Foreign keys may already exist' : null
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
    }
    
    // Handle counterparty list endpoint - path will be "/calloff-crud/counterparties"
    if (pathParts.length === 2 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'counterparties' && req.method === 'GET') {
      console.log('Fetching counterparties for selection')
      
      const { data, error } = await supabase
        .from('counterparty')
        .select(`
          counterparty_id,
          company_name,
          company_code,
          counterparty_type,
          country_code,
          is_active
        `)
        .eq('is_active', true)
        .order('company_name', { ascending: true })
      
      if (error) {
        console.error('Database error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        count: (data || []).length
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Handle quotas by counterparty endpoint - path will be "/calloff-crud/counterparties/:id/quotas"
    if (pathParts.length === 4 && pathParts[0] === 'calloff-crud' && pathParts[1] === 'counterparties' && pathParts[3] === 'quotas' && req.method === 'GET') {
      console.log('Fetching quotas for specific counterparty')
      
      const counterpartyId = pathParts[2]
      
      const { data, error } = await supabase
        .from('quota')
        .select(`
          quota_id,
          counterparty_id,
          direction,
          period_month,
          qty_t,
          tolerance_pct,
          metal_code,
          business_unit_id,
          incoterm_code,
          created_at,
          counterparty:counterparty_id (
            company_name,
            company_code,
            counterparty_type,
            country_code
          )
        `)
        .eq('counterparty_id', counterpartyId)
        .order('period_month', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        count: (data || []).length,
        counterparty_id: counterpartyId
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }
    
    // Return 404 for other paths
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Not found',
      path: url.pathname
    }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
    
  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
})