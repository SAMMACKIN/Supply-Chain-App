# Get Your Supabase Anon Keys

The "Invalid value" error usually means the anon key is incorrect or malformed.

## Option 1: From Supabase Dashboard (Recommended)

### Development Project:
1. Go to: https://app.supabase.com/project/pxwtdaqhwzweedflwora
2. Click on "Settings" (gear icon)
3. Click on "API" in the sidebar
4. Copy the **anon public** key (NOT the service_role key)

### Production Project:
1. Go to: https://app.supabase.com/project/brixbdbunhwlhuwunqxw
2. Click on "Settings" (gear icon)
3. Click on "API" in the sidebar
4. Copy the **anon public** key (NOT the service_role key)

## Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Get development project keys
supabase projects api-keys --project-ref pxwtdaqhwzweedflwora

# Get production project keys
supabase projects api-keys --project-ref brixbdbunhwlhuwunqxw
```

## Common Issues

1. **Wrong key type**: Make sure you're using the `anon` key, not `service_role`
2. **Extra spaces**: Check for spaces at the beginning or end of the key
3. **Truncated key**: The key should be ~200+ characters long
4. **Wrong project**: Make sure dev uses dev key, prod uses prod key

## Test the Keys

You can test if a key works by running this in your browser console:

```javascript
// Test development
fetch('https://pxwtdaqhwzweedflwora.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_DEV_ANON_KEY_HERE',
    'Authorization': 'Bearer YOUR_DEV_ANON_KEY_HERE'
  }
}).then(r => console.log('Dev key status:', r.status))

// Test production
fetch('https://brixbdbunhwlhuwunqxw.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'YOUR_PROD_ANON_KEY_HERE',
    'Authorization': 'Bearer YOUR_PROD_ANON_KEY_HERE'
  }
}).then(r => console.log('Prod key status:', r.status))
```

A status of 200 means the key is valid.