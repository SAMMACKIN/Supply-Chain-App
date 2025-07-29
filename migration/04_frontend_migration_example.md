# Frontend Migration Examples

## Before (Supabase) vs After (API Client)

### 1. Fetching Quotas

**Before (Supabase):**
```typescript
const { data: quotas, error } = await supabase
  .from('quota')
  .select(`
    *,
    counterparty:counterparty_id(
      company_name,
      company_code
    )
  `)
  .eq('direction', 'BUY')
  .order('month', { ascending: false });
```

**After (API Client):**
```typescript
const response = await api.quotas.list({ direction: 'BUY' });
const quotas = response.data;
```

### 2. Creating Call-Off

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('call_off')
  .insert({
    quota_id: values.quota_id,
    bundle_qty: values.bundle_qty,
    // ... other fields
  })
  .select()
  .single();
```

**After (API Client):**
```typescript
const response = await api.callOffs.create({
  quota_id: values.quota_id,
  bundle_qty: values.bundle_qty,
  // ... other fields
});
const callOff = response.data;
```

### 3. React Query Hook Update

**Before:**
```typescript
const { data: quotas } = useQuery({
  queryKey: ['quotas'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('quota')
      .select('*');
    if (error) throw error;
    return data;
  },
});
```

**After:**
```typescript
import { api, queryKeys } from '@/services/api-client';

const { data: quotas } = useQuery({
  queryKey: queryKeys.quotas.list(),
  queryFn: async () => {
    const response = await api.quotas.list();
    return response.data;
  },
});
```

### 4. Authentication Update

**Before (AuthProvider.tsx):**
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

**After (with Clerk):**
```typescript
import { useUser, useAuth } from '@clerk/clerk-react';

const { user, isLoaded } = useUser();
const { getToken } = useAuth();
```

### 5. Component Update Example

**Before (CallOffList.tsx):**
```typescript
import { supabase } from '@/lib/supabase';

export function CallOffList() {
  const { data: callOffs } = useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('call_off')
        .select('*');
      return data;
    },
  });
  // ...
}
```

**After:**
```typescript
import { api, queryKeys } from '@/services/api-client';

export function CallOffList() {
  const { data: callOffs } = useQuery({
    queryKey: queryKeys.callOffs.list(),
    queryFn: async () => {
      const response = await api.callOffs.list();
      return response.data;
    },
  });
  // ...
}
```

## Migration Checklist for Each Component

1. **Remove Supabase imports**
   - Remove `import { supabase } from '@/lib/supabase'`
   - Add `import { api } from '@/services/api-client'`

2. **Update queries**
   - Replace `supabase.from()` with `api.*` calls
   - Update error handling

3. **Update mutations**
   - Replace insert/update/delete with API calls
   - Handle response format differences

4. **Update auth checks**
   - Replace Supabase auth with Clerk hooks
   - Update protected routes

## Files to Update (Priority Order)

1. **High Priority (Core functionality)**
   - `/services/calloff-api.ts` - Main API service
   - `/auth/AuthProvider.tsx` - Authentication
   - `/components/CallOff/CallOffList.tsx`
   - `/components/CallOff/CreateCallOffForm.tsx`
   - `/components/CallOff/CallOffDetailView.tsx`

2. **Medium Priority**
   - `/components/CallOff/ShipmentLineList.tsx`
   - `/components/CallOff/EditCallOffDialog.tsx`
   - `/pages/MuiCallOffs.tsx`
   - `/pages/MuiQuotas.tsx`

3. **Low Priority**
   - UI components that don't fetch data
   - Utility functions
   - Type definitions (mostly unchanged)