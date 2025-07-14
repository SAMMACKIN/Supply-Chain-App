#!/bin/bash

echo "Getting Supabase Anon Keys..."
echo "================================"

# Install Supabase CLI if not present
if ! command -v supabase &> /dev/null; then
    echo "Installing Supabase CLI..."
    brew install supabase/tap/supabase
fi

# Login if needed
echo "Logging into Supabase..."
supabase login

echo ""
echo "Development Project Keys:"
echo "========================"
supabase projects api-keys --project-ref pxwtdaqhwzweedflwora | grep -A1 "anon"

echo ""
echo "Production Project Keys:"
echo "========================"
supabase projects api-keys --project-ref brixbdbunhwlhuwunqxw | grep -A1 "anon"

echo ""
echo "To use these keys in Vercel:"
echo "1. Go to your Vercel project settings"
echo "2. Navigate to Environment Variables"
echo "3. Update VITE_SUPABASE_ANON_KEY with the anon key value"
echo "4. Make sure to set different values for Production and Preview environments"