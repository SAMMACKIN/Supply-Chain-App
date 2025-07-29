# Clerk Authentication Setup

## 1. Create Clerk Account

1. Go to [clerk.com](https://clerk.com)
2. Sign up for free account
3. Create new application
4. Choose "React" as your framework

## 2. Get API Keys

From Clerk Dashboard:
- **Publishable Key**: `pk_test_...` (for frontend)
- **Secret Key**: `sk_test_...` (for backend)

## 3. Install Clerk in Frontend

```bash
cd frontend
npm install @clerk/clerk-react
```

## 4. Create Clerk Provider

Create `frontend/src/providers/ClerkProvider.tsx`:

```typescript
import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseClerkProvider publishableKey={clerkPubKey}>
      {children}
    </BaseClerkProvider>
  );
}
```

## 5. Update App.tsx

```typescript
import { ClerkProvider } from './providers/ClerkProvider';
import { SignIn, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <SignedIn>
            {/* Your authenticated app */}
            <Routes>
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </SignedIn>
          <SignedOut>
            {/* Sign in page */}
            <SignIn routing="path" path="/sign-in" />
          </SignedOut>
        </QueryClientProvider>
      </BrowserRouter>
    </ClerkProvider>
  );
}
```

## 6. Replace AuthProvider

Update `frontend/src/hooks/useAuth.ts`:

```typescript
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

export function useAuth() {
  const { isLoaded, userId, sessionId, getToken } = useClerkAuth();
  const { user } = useUser();
  
  return {
    isLoading: !isLoaded,
    isAuthenticated: !!userId,
    user: user ? {
      id: userId,
      email: user.primaryEmailAddress?.emailAddress || '',
      name: user.fullName || user.firstName || 'User',
    } : null,
    getToken, // For API requests
  };
}
```

## 7. Update API Client

Update `frontend/src/services/api-client.ts`:

```typescript
import { useAuth } from '@clerk/clerk-react';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { getToken } = useAuth();
  const token = await getToken();
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
  
  // ... rest of the function
}
```

## 8. Configure Clerk Features

In Clerk Dashboard:

1. **Email/Password**: Enable in Authentication > Email
2. **Social Login**: Add Google, GitHub, etc.
3. **User Metadata**: Add custom fields:
   - `role`: 'ADMIN' | 'OPS' | 'READ_ONLY'
   - `business_unit`: string
   - `warehouse_ids`: string[]

## 9. Backend Middleware Update

Update `backend/src/api/middleware/auth.ts`:

```typescript
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = await clerkClient.verifyToken(token);
    req.auth = {
      userId: decoded.sub,
      sessionId: decoded.sid,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

## 10. User Profile Sync

Create webhook endpoint for Clerk:

```typescript
// backend/src/api/routes/webhooks.ts
router.post('/clerk', async (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'user.created' || type === 'user.updated') {
    await prisma.userProfile.upsert({
      where: { user_id: data.id },
      create: {
        user_id: data.id,
        role: data.public_metadata?.role || 'OPS',
        business_unit: data.public_metadata?.business_unit || 'BU001',
        warehouse_ids: data.public_metadata?.warehouse_ids || [],
      },
      update: {
        role: data.public_metadata?.role || 'OPS',
        business_unit: data.public_metadata?.business_unit || 'BU001',
        warehouse_ids: data.public_metadata?.warehouse_ids || [],
      },
    });
  }
  
  res.json({ received: true });
});
```

## 11. Environment Variables

Frontend `.env`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://your-backend.railway.app/api
```

Backend (Railway):
```
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

## 12. Test Authentication

1. Start frontend: `npm run dev`
2. You should see Clerk's sign-in UI
3. Create an account
4. Check that API calls include auth token
5. Verify backend accepts the token

## Migration from Supabase Auth

Key differences:
- No need for `AuthProvider` component
- Clerk handles all UI (sign in, sign up, user profile)
- User IDs are now Clerk user IDs (not Supabase UUIDs)
- Sessions managed by Clerk
- Built-in user management dashboard

## Common Issues

1. **CORS errors**: Ensure your backend allows your frontend URL
2. **Token errors**: Check that Clerk keys match between frontend/backend
3. **User not found**: Ensure webhook creates user profile
4. **Missing metadata**: Set default values in Clerk dashboard