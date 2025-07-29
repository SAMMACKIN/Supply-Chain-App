#!/bin/bash

# Load environment variables
source .env.local

# Read the SQL file
SQL_CONTENT=$(cat fix_user_profiles_corrected.sql)

# Execute SQL via Supabase Management API
curl -X POST "https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_ACCESS_TOKEN}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}"