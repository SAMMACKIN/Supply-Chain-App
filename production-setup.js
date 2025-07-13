#!/usr/bin/env node

/**
 * Production Database Setup Script
 * 
 * This script automatically sets up the counterparty table and links quotas
 * for production deployment. Run this after deploying to production environment.
 * 
 * Usage:
 *   node production-setup.js --env production
 *   node production-setup.js --env development  (for testing)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse command line arguments
const args = process.argv.slice(2)
const envIndex = args.indexOf('--env')
const environment = envIndex !== -1 ? args[envIndex + 1] : 'development'

console.log(`🚀 Setting up database for ${environment} environment`)

// Load environment variables
let envFile
try {
  envFile = readFileSync(`./frontend/.env.local`, 'utf8')
} catch (error) {
  console.error('❌ Could not read .env.local file')
  console.error('Make sure you are in the project root directory')
  process.exit(1)
}

const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

console.log(`📡 Connecting to: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setupProduction() {
  try {
    console.log('\n1️⃣ Creating counterparty table...')
    
    const createTableResponse = await fetch(`${supabaseUrl}/functions/v1/calloff-crud/create-counterparty-table`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const createResult = await createTableResponse.json()
    
    if (createResult.success) {
      console.log('✅ Counterparty table created successfully')
      console.log(`   - Inserted ${createResult.insertedRowCount || 0} sample records`)
    } else {
      console.log('⚠️ Counterparty table creation response:', createResult.message || createResult.error)
    }
    
    console.log('\n2️⃣ Linking quotas to counterparties...')
    
    const linkResponse = await fetch(`${supabaseUrl}/functions/v1/calloff-crud/link-quotas-to-counterparties`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const linkResult = await linkResponse.json()
    
    if (linkResult.success) {
      console.log('✅ Quotas linked to counterparties successfully')
      console.log(`   - Updated ${linkResult.updatedQuotas} quota records`)
      console.log(`   - Using ${linkResult.availableCounterparties} counterparties`)
    } else {
      console.error('❌ Failed to link quotas:', linkResult.error)
    }
    
    console.log('\n3️⃣ Creating foreign key relationships...')
    
    const fkResponse = await fetch(`${supabaseUrl}/functions/v1/calloff-crud/create-foreign-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const fkResult = await fkResponse.json()
    
    if (fkResult.success) {
      console.log('✅ Foreign key relationships created successfully')
      fkResult.relationships.forEach(rel => console.log(`   - ${rel}`))
    } else {
      console.error('❌ Failed to create foreign keys:', fkResult.error)
      if (fkResult.hint) console.log(`   💡 ${fkResult.hint}`)
    }
    
    console.log('\n4️⃣ Verifying setup...')
    
    // Test the quotas API
    const quotasResponse = await fetch(`${supabaseUrl}/functions/v1/calloff-crud/quotas`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const quotasResult = await quotasResponse.json()
    
    if (quotasResult.success && quotasResult.data && quotasResult.data.length > 0) {
      console.log('✅ Quota API working correctly')
      console.log(`   - Found ${quotasResult.count} quotas`)
      
      const quotaWithCounterparty = quotasResult.data.find(q => q.counterparty)
      if (quotaWithCounterparty) {
        console.log(`   - Example: ${quotaWithCounterparty.counterparty.company_name} (${quotaWithCounterparty.counterparty.company_code})`)
      }
    } else {
      console.error('❌ Quota API test failed:', quotasResult.error)
    }
    
    console.log('\n🎉 Production setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update counterparty data with real production companies')
    console.log('2. Deploy frontend application')
    console.log('3. Test end-to-end functionality')
    
    if (environment === 'production') {
      console.log('\n⚠️  PRODUCTION REMINDERS:')
      console.log('- Replace sample counterparty data with real companies')
      console.log('- Set up proper backup procedures')
      console.log('- Configure monitoring and alerting')
      console.log('- Review security settings and RLS policies')
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Confirmation for production
if (environment === 'production') {
  console.log('\n⚠️  You are about to set up the PRODUCTION database!')
  console.log('This will create tables and modify existing data.')
  console.log('\nPress Ctrl+C to cancel, or press Enter to continue...')
  
  process.stdin.once('data', () => {
    setupProduction()
  })
} else {
  setupProduction()
}