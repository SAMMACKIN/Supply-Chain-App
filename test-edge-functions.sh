#!/bin/bash

echo "Testing Edge Functions..."
echo "========================"

# Development Edge Function
echo ""
echo "Testing Development Edge Function:"
curl -i "https://pxwtdaqhwzweedflwora.supabase.co/functions/v1/calloff-crud/quotas" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA3ODQwNjMsImV4cCI6MjAzNjM2MDA2M30.bD-Qb9G0MdnKQzBahD1PP3vgZT5g3xmxGSiM" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA3ODQwNjMsImV4cCI6MjAzNjM2MDA2M30.bD-Qb9G0MdnKQzBahD1PP3vgZT5g3xmxGSiM"

echo ""
echo ""
echo "Testing Production Edge Function:"
curl -i "https://brixbdbunhwlhuwunqxw.supabase.co/functions/v1/calloff-crud/quotas" \
  -H "Authorization: Bearer YOUR_PROD_ANON_KEY" \
  -H "apikey: YOUR_PROD_ANON_KEY"

echo ""
echo ""
echo "Note: Replace YOUR_PROD_ANON_KEY with your actual production anon key"