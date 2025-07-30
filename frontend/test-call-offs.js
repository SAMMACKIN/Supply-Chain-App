// Test script for call-off functionality
// Run this in the browser console on your deployed app

console.log('=== CALL-OFF FUNCTIONALITY TEST ===');

// 1. Test API connectivity
async function testApiConnectivity() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://supply-chain-app-development.up.railway.app/api';
    console.log('Testing API URL:', apiUrl);
    
    const response = await fetch(`${apiUrl}/counterparties`);
    const data = await response.json();
    console.log('✅ API Connection successful:', data.success);
    return true;
  } catch (error) {
    console.error('❌ API Connection failed:', error);
    return false;
  }
}

// 2. Test call-off creation API
async function testCallOffCreation() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://supply-chain-app-development.up.railway.app/api';
    
    // First get a quota to use
    const quotasResponse = await fetch(`${apiUrl}/quotas`);
    const quotasData = await quotasResponse.json();
    const quotas = quotasData.data || quotasData;
    
    if (!quotas || quotas.length === 0) {
      console.error('❌ No quotas available for testing');
      return;
    }
    
    const testQuota = quotas[0];
    console.log('Using quota for test:', testQuota.quota_id);
    
    // Create test call-off
    const callOffData = {
      quota_id: testQuota.quota_id,
      bundle_qty: 1,
      requested_delivery_date: new Date().toISOString()
    };
    
    const response = await fetch(`${apiUrl}/call-offs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callOffData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Call-off creation successful:', result);
      return result;
    } else {
      const error = await response.json();
      console.error('❌ Call-off creation failed:', error);
    }
  } catch (error) {
    console.error('❌ Call-off creation error:', error);
  }
}

// 3. Test routing
function testRouting() {
  console.log('Current URL:', window.location.href);
  console.log('Current pathname:', window.location.pathname);
  console.log('Base URI:', document.baseURI);
  
  // Check if we're on the right domain
  if (window.location.pathname.includes('/mui/')) {
    console.error('❌ Detected "/mui/" in pathname - this is the routing issue!');
    console.log('Expected path should be "/call-offs", not "/mui/call-offs"');
  } else {
    console.log('✅ Pathname looks correct');
  }
}

// 4. Run all tests
async function runAllTests() {
  console.log('\n--- Testing API Connectivity ---');
  await testApiConnectivity();
  
  console.log('\n--- Testing Routing ---');
  testRouting();
  
  console.log('\n--- Testing Call-Off Creation ---');
  await testCallOffCreation();
  
  console.log('\n=== TEST COMPLETE ===');
}

// Auto-run tests
runAllTests();