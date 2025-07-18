#!/bin/bash

# Test Edge Function for shipment line creation

SUPABASE_URL="https://pxwtdaqhwzweedflwora.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkwMDEzNjAsImV4cCI6MjA0NDU3NzM2MH0.28MstR_DILA-LCaZdiNxIjxBqYfqmcDU6k-6GaGky94"
CALL_OFF_ID="e06c8c36-31a0-4746-b948-de0f1cba9b0a"

# Replace with your auth token from browser console:
# Run this in browser console: (await supabase.auth.getSession()).data.session.access_token
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"

echo "Testing shipment line creation..."
echo "Call-off ID: $CALL_OFF_ID"

curl -X POST \
  "$SUPABASE_URL/functions/v1/calloff-crud/call-offs/$CALL_OFF_ID/shipment-lines" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "bundle_qty": 10,
    "metal_code": "CU",
    "notes": "Test shipment line"
  }' \
  -v

echo -e "\n\nTo get your auth token, run this in browser console:"
echo "(await supabase.auth.getSession()).data.session.access_token"