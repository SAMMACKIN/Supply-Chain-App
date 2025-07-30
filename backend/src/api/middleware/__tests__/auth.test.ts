import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import { requireAuth, requireRole } from '../auth';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkSyncService } from '../../../services/clerk-sync';

// Mock dependencies
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    sessions: {
      verifySession: jest.fn(),
    },
  },
}));

jest.mock('../../../services/clerk-sync', () => ({
  ClerkSyncService: {
    getOrCreateUserProfile: jest.fn(),
  },
}));

jest.mock('../../../config/environment', () => ({
  env: {
    CLERK_SECRET_KEY: 'test-clerk-secret-key',
  },
}));

// Create Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

// Sample test data
const mockSession = {
  id: 'sess_test123',
  userId: 'user_test123',
  status: 'active',
  lastActiveAt: new Date(),
  expireAt: new Date(Date.now() + 3600000), // 1 hour from now
};

const mockUserProfile = {
  user_id: 'user_test123',
  role: 'OPS',
  business_unit: 'BU001',
  warehouse_ids: ['WH001', 'WH002'],
  created_at: new Date('2025-01-01T10:00:00Z'),
  updated_at: new Date('2025-01-01T10:00:00Z'),
};

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should authenticate valid Bearer token and add auth to request', async () => {
      const app = createTestApp();
      
      // Mock successful Clerk session verification
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue(mockSession);
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      // Test route that uses requireAuth
      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({
          success: true,
          auth: _req.auth,
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        auth: {
          userId: 'user_test123',
          sessionId: 'sess_test123',
          claims: {
            ...mockSession,
            expireAt: mockSession.expireAt.toISOString(),
            lastActiveAt: mockSession.lastActiveAt.toISOString(),
          },
        },
      });

      expect(clerkClient.sessions.verifySession).toHaveBeenCalledWith(
        'valid-token-123',
        'test-clerk-secret-key'
      );
      expect(ClerkSyncService.getOrCreateUserProfile).toHaveBeenCalledWith('user_test123');
    });

    it('should reject request with missing authorization header', async () => {
      const app = createTestApp();
      
      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing or invalid authorization header',
      });

      expect(clerkClient.sessions.verifySession).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization header format', async () => {
      const app = createTestApp();
      
      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Test various invalid formats
      const invalidHeaders = [
        'InvalidFormat token123',
        'Bearer',
        'token123',
        'Basic dXNlcjpwYXNz',
      ];

      for (const header of invalidHeaders) {
        const response = await request(app)
          .get('/test')
          .set('Authorization', header)
          .expect(401);

        expect(response.body).toEqual({
          success: false,
          error: 'Missing or invalid authorization header',
        });
      }
    });

    it('should reject request with invalid session token', async () => {
      const app = createTestApp();
      
      // Mock Clerk returning null for invalid token
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue(null);

      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired session token',
      });
    });

    it('should reject request when session has no userId', async () => {
      const app = createTestApp();
      
      // Mock session without userId
      const sessionWithoutUserId = { ...mockSession, userId: null };
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue(sessionWithoutUserId);

      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer token-without-userid')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired session token',
      });
    });

    it('should handle Clerk verification errors gracefully', async () => {
      const app = createTestApp();
      
      // Mock Clerk throwing an error
      (clerkClient.sessions.verifySession as jest.Mock).mockRejectedValue(
        new Error('Clerk API error')
      );

      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer error-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication failed',
      });
    });

    it('should handle ClerkSyncService errors gracefully', async () => {
      const app = createTestApp();
      
      // Mock successful Clerk verification but failed user profile sync
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue(mockSession);
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication failed',
      });
    });

    it('should handle malformed Bearer tokens', async () => {
      const app = createTestApp();
      
      app.get('/test', requireAuth, (_req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Test edge cases
      const edgeCaseHeaders = [
        'Bearer ', // Empty token
        'Bearer  ', // Only spaces
        'Bearer\t\ttoken', // Tabs instead of space
        'Bearer token with spaces',
      ];

      for (const header of edgeCaseHeaders) {
        await request(app)
          .get('/test')
          .set('Authorization', header)
          .expect(401);
      }
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', async () => {
      const app = createTestApp();
      
      // Mock authenticated request
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.auth = {
          userId: 'user_test123',
          sessionId: 'sess_test123',
        };
        next();
      });

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      app.get('/test', requireRole(['OPS', 'TRADE']), (_req: Request, res: Response) => {
        res.json({
          success: true,
          userProfile: _req.userProfile,
        });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        userProfile: {
          ...mockUserProfile,
          created_at: mockUserProfile.created_at.toISOString(),
          updated_at: mockUserProfile.updated_at.toISOString(),
        },
      });
    });

    it('should deny access for user without required role', async () => {
      const app = createTestApp();
      
      // Mock authenticated request
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.auth = {
          userId: 'user_test123',
          sessionId: 'sess_test123',
        };
        next();
      });

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue({
        ...mockUserProfile,
        role: 'PLANNER',
      });

      app.get('/test', requireRole(['OPS', 'TRADE']), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Access denied. Required roles: OPS, TRADE',
      });
    });

    it('should reject if no auth present', async () => {
      const app = createTestApp();
      
      app.get('/test', requireRole(['OPS']), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should handle user profile not found', async () => {
      const app = createTestApp();
      
      // Mock authenticated request
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.auth = {
          userId: 'user_test123',
          sessionId: 'sess_test123',
        };
        next();
      });

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(null);

      app.get('/test', requireRole(['OPS']), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'User profile not found',
      });
    });

    it('should handle database errors in role check', async () => {
      const app = createTestApp();
      
      // Mock authenticated request
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.auth = {
          userId: 'user_test123',
          sessionId: 'sess_test123',
        };
        next();
      });

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      app.get('/test', requireRole(['OPS']), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to verify user permissions',
      });
    });

    it('should work with single role string converted to array', async () => {
      const app = createTestApp();
      
      // Mock authenticated request
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.auth = {
          userId: 'user_test123',
          sessionId: 'sess_test123',
        };
        next();
      });

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      app.get('/test', requireRole(['OPS']), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should handle empty allowed roles array', async () => {
      const app = createTestApp();
      
      // Mock authenticated request
      app.use((_req: Request, _res: Response, next: NextFunction) => {
        _req.auth = {
          userId: 'user_test123',
          sessionId: 'sess_test123',
        };
        next();
      });

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      app.get('/test', requireRole([]), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Access denied. Required roles: ',
      });
    });
  });

  describe('Integration: requireAuth + requireRole', () => {
    it('should work together in middleware chain', async () => {
      const app = createTestApp();
      
      // Mock successful auth and role check
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue(mockSession);
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      app.get('/test', requireAuth, requireRole(['OPS']), (_req: Request, _res: Response) => {
        _res.json({
          success: true,
          auth: _req.auth,
          userProfile: _req.userProfile,
        });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.auth.userId).toBe('user_test123');
      expect(response.body.userProfile.role).toBe('OPS');

      // Verify getOrCreateUserProfile was called twice (once in each middleware)
      expect(ClerkSyncService.getOrCreateUserProfile).toHaveBeenCalledTimes(2);
    });

    it('should fail at auth level without calling role check', async () => {
      const app = createTestApp();
      
      app.get('/test', requireAuth, requireRole(['OPS']), (_req: Request, _res: Response) => {
        _res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing or invalid authorization header',
      });

      // Role check should not be called if auth fails
      expect(ClerkSyncService.getOrCreateUserProfile).not.toHaveBeenCalled();
    });
  });
});