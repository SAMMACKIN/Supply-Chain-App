# Vercel Environment Variable Format Guide

## Correct Format for Supabase Keys

When adding environment variables in Vercel, make sure:

### ✅ CORRECT Format:
```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4d3RkYXFod3p3ZWVkZmx3b3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA3ODQwNjMsImV4cCI6MjAzNjM2MDA2M30.your-key-signature-here
```

### ❌ INCORRECT Formats:
```
# Don't include quotes
Value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Don't include bearer prefix
Value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Don't have spaces at start/end
Value:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... 

# Don't split across lines
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
...continuation
```

## How to Add Correctly

1. Copy the anon key from Supabase dashboard
2. In Vercel, click "Add Variable"
3. Paste the key directly into the Value field
4. Don't add any quotes or extra formatting
5. Make sure no trailing spaces

## Verify in Vercel

After adding, the variable should look like:
- No quotes visible in the UI
- Starts with `eyJ`
- One continuous string
- ~200+ characters long

## After Updating

1. Click "Save"
2. Go to Deployments
3. Click "..." → "Redeploy"
4. Select "Use existing build cache" = NO
5. Redeploy

The app now trims whitespace automatically, but it's best to add them correctly.