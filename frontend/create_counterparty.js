import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables manually
const envFile = readFileSync('./.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key] = value
  }
})

const supabaseUrl = envVars.SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Service Key available:', !!supabaseServiceKey)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createCounterpartyTable() {
  try {
    console.log('Creating counterparty table...')
    
    // Sample data to insert
    const sampleData = [
      { company_name: 'Acme Corporation', company_code: 'ACME', counterparty_type: 'CUSTOMER', country_code: 'US', primary_contact_name: 'John Smith', city: 'New York' },
      { company_name: 'Global Metals Ltd', company_code: 'GLOBAL', counterparty_type: 'SUPPLIER', country_code: 'GB', primary_contact_name: 'Sarah Johnson', city: 'London' },
      { company_name: 'TechCorp Industries', company_code: 'TECH', counterparty_type: 'CUSTOMER', country_code: 'DE', primary_contact_name: 'Hans Mueller', city: 'Berlin' },
      { company_name: 'Pacific Mining Co', company_code: 'PACIFIC', counterparty_type: 'SUPPLIER', country_code: 'AU', primary_contact_name: 'Michael Chen', city: 'Sydney' },
      { company_name: 'European Alloys SA', company_code: 'EURO', counterparty_type: 'BOTH', country_code: 'FR', primary_contact_name: 'Marie Dubois', city: 'Paris' }
    ]
    
    // Test if table exists by doing a simple query
    const { data: testData, error: testError } = await supabase
      .from('counterparty')
      .select('counterparty_id')
      .limit(1)
    
    if (testError && testError.code === '42P01') {
      console.error('❌ Counterparty table does not exist. Please create it manually in Supabase SQL Editor:')
      console.log(`
CREATE TABLE counterparty (
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
      `)
      return
    }
    
    if (testError) {
      console.error('❌ Error checking counterparty table:', testError.message)
      return
    }
    
    console.log('✅ Counterparty table exists!')
    
    // Insert sample data
    const { data: insertedData, error: insertError } = await supabase
      .from('counterparty')
      .upsert(sampleData, { 
        onConflict: 'company_code',
        ignoreDuplicates: true 
      })
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting sample data:', insertError.message)
    } else {
      console.log(`✅ Successfully processed ${insertedData?.length || 0} counterparty records`)
    }
    
    // Test the quota join
    console.log('\nTesting quota with counterparty join...')
    const { data: quotaData, error: quotaError } = await supabase
      .from('quota')
      .select(`
        quota_id,
        counterparty_id,
        direction,
        metal_code,
        counterparty:counterparty_id (
          company_name,
          company_code,
          country_code
        )
      `)
      .limit(3)
    
    if (quotaError) {
      console.error('❌ Error testing quota join:', quotaError.message)
    } else {
      console.log('✅ Quota with counterparty join successful:')
      console.log(JSON.stringify(quotaData, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

createCounterpartyTable()