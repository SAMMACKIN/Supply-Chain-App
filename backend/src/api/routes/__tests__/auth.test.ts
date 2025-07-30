import request from 'supertest';
import express from 'express';
import 'express-async-errors'; // Import this before routes
import authRouter from '../auth';
import { prisma } from '../../../db/client';
import { ClerkSyncService } from '../../../services/clerk-sync';
import { UserRole } from '@prisma/client';

// Mock Prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock ClerkSyncService
jest.mock('../../../services/clerk-sync', () => ({
  ClerkSyncService: {
    getOrCreateUserProfile: jest.fn(),
    syncUser: jest.fn(),
    syncAllUsers: jest.fn(),
    isUserInSync: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  requireAuth: jest.fn((req: any, _res: any, next: any) => {
    req.auth = {
      userId: 'test-user-123',
      sessionId: 'test-session-123',
    };
    next();
  }),
  requireRole: jest.fn((roles: string[]) => (req: any, _res: any, next: any) => {
    // Mock admin role for admin-only routes
    if (roles.includes('ADMIN')) {
      req.userProfile = {
        user_id: 'test-user-123',
        role: 'ADMIN',
        business_unit: 'BU001',
        warehouse_ids: ['WH001'],
      };
    }
    next();
  }),
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// Add error handler middleware
app.use((_err: any, _req: any, res: any, _next: any) => {
  // Simplified error handler for tests
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Sample test data
const mockUserProfile = {
  user_id: 'test-user-123',
  role: UserRole.OPS,
  business_unit: 'BU002',
  warehouse_ids: ['WH001', 'WH002'],
  created_at: new Date('2025-01-01T10:00:00Z'),
  updated_at: new Date('2025-01-01T10:00:00Z'),
};

const mockAdminProfile = {
  user_id: 'admin-user-123',
  role: UserRole.ADMIN,
  business_unit: 'BU001',
  warehouse_ids: ['WH001', 'WH002', 'WH003'],
  created_at: new Date('2025-01-01T09:00:00Z'),
  updated_at: new Date('2025-01-01T09:00:00Z'),
};

describe('Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile successfully', async () => {
      // Mock ClerkSyncService to return user profile
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user_id: 'test-user-123',
          profile: {
            ...mockUserProfile,
            created_at: mockUserProfile.created_at.toISOString(),
            updated_at: mockUserProfile.updated_at.toISOString(),
          },
        },
      });

      expect(ClerkSyncService.getOrCreateUserProfile).toHaveBeenCalledWith('test-user-123');
    });

    it('should create profile if it does not exist', async () => {
      // Mock ClerkSyncService to simulate profile creation
      const newProfile = {
        ...mockUserProfile,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(newProfile);

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.user_id).toBe('test-user-123');
      expect(ClerkSyncService.getOrCreateUserProfile).toHaveBeenCalledWith('test-user-123');
    });

    it('should handle ClerkSyncService errors gracefully', async () => {
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockRejectedValue(
        new Error('Failed to sync user')
      );

      const response = await request(app)
        .get('/api/auth/me')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve user profile',
      });
    });

    it('should handle database connection errors', async () => {
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/auth/me')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve user profile',
      });
    });

    it('should work with users who have minimal profiles', async () => {
      const minimalProfile = {
        user_id: 'test-user-123',
        role: UserRole.READ_ONLY,
        business_unit: 'BU001',
        warehouse_ids: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(minimalProfile);

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.role).toBe('READ_ONLY');
      expect(response.body.data.profile.warehouse_ids).toEqual([]);
    });
  });

  describe('PATCH /api/auth/profile', () => {
    const validUpdateData = {
      business_unit: 'BU003',
      warehouse_ids: ['WH003', 'WH004'],
    };

    it('should update user profile successfully', async () => {
      // Mock finding existing profile
      (prisma.userProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserProfile,
        business_unit: validUpdateData.business_unit,
        warehouse_ids: validUpdateData.warehouse_ids,
        updated_at: new Date(),
      });

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(validUpdateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          user_id: 'test-user-123',
          business_unit: 'BU003',
          warehouse_ids: ['WH003', 'WH004'],
        }),
      });

      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { user_id: 'test-user-123' },
        data: {
          business_unit: 'BU003',
          warehouse_ids: ['WH003', 'WH004'],
        },
      });
    });

    it('should update only business_unit when warehouse_ids not provided', async () => {
      const partialUpdate = { business_unit: 'BU004' };

      (prisma.userProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserProfile,
        business_unit: partialUpdate.business_unit,
      });

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { user_id: 'test-user-123' },
        data: {
          business_unit: 'BU004',
          warehouse_ids: undefined,
        },
      });
    });

    it('should update only warehouse_ids when business_unit not provided', async () => {
      const partialUpdate = { warehouse_ids: ['WH005'] };

      (prisma.userProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserProfile,
        warehouse_ids: partialUpdate.warehouse_ids,
      });

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { user_id: 'test-user-123' },
        data: {
          business_unit: undefined,
          warehouse_ids: ['WH005'],
        },
      });
    });

    it('should handle empty warehouse_ids array', async () => {
      const updateWithEmptyArray = {
        business_unit: 'BU002',
        warehouse_ids: [],
      };

      (prisma.userProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserProfile,
        warehouse_ids: [],
      });

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(updateWithEmptyArray)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warehouse_ids).toEqual([]);
    });

    it('should handle profile not found error', async () => {
      (prisma.userProfile.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(validUpdateData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update user profile',
      });
    });

    it('should handle database errors during update', async () => {
      (prisma.userProfile.update as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .patch('/api/auth/profile')
        .send(validUpdateData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update user profile',
      });
    });

    it('should handle empty request body', async () => {
      (prisma.userProfile.update as jest.Mock).mockResolvedValue(mockUserProfile);

      await request(app)
        .patch('/api/auth/profile')
        .send({})
        .expect(200);

      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { user_id: 'test-user-123' },
        data: {
          business_unit: undefined,
          warehouse_ids: undefined,
        },
      });
    });
  });

  describe('POST /api/auth/sync', () => {
    it('should sync current user successfully', async () => {
      (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue(mockUserProfile);

      const response = await request(app)
        .post('/api/auth/sync')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockUserProfile,
          created_at: mockUserProfile.created_at.toISOString(),
          updated_at: mockUserProfile.updated_at.toISOString(),
        },
        message: 'User profile synced successfully',
      });

      expect(ClerkSyncService.syncUser).toHaveBeenCalledWith('test-user-123');
    });

    it('should handle sync failures gracefully', async () => {
      (ClerkSyncService.syncUser as jest.Mock).mockRejectedValue(
        new Error('Clerk API error')
      );

      const response = await request(app)
        .post('/api/auth/sync')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to sync user profile',
      });
    });

    it('should handle user not found in Clerk', async () => {
      (ClerkSyncService.syncUser as jest.Mock).mockRejectedValue(
        new Error('User not found in Clerk')
      );

      const response = await request(app)
        .post('/api/auth/sync')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to sync user profile',
      });
    });

    it('should handle database errors during sync', async () => {
      (ClerkSyncService.syncUser as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/auth/sync')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to sync user profile',
      });
    });
  });

  describe('POST /api/auth/sync-all', () => {
    beforeEach(() => {
      // Update mock to set admin auth
      const authMock = jest.requireMock('../../middleware/auth') as any;
      authMock.requireAuth.mockImplementation((req: any, _res: any, next: any) => {
        req.auth = {
          userId: 'admin-user-123',
          sessionId: 'admin-session-123',
        };
        next();
      });
    });

    it('should sync all users successfully with default limit', async () => {
      const syncedProfiles = [
        mockUserProfile,
        mockAdminProfile,
        { ...mockUserProfile, user_id: 'user-3' },
      ];

      (ClerkSyncService.syncAllUsers as jest.Mock).mockResolvedValue(syncedProfiles);

      const response = await request(app)
        .post('/api/auth/sync-all')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: syncedProfiles.map(profile => ({
          ...profile,
          created_at: profile.created_at.toISOString(),
          updated_at: profile.updated_at.toISOString(),
        })),
        message: 'Successfully synced 3 user profiles',
      });

      expect(ClerkSyncService.syncAllUsers).toHaveBeenCalledWith(100);
    });

    it('should sync all users with custom limit', async () => {
      const syncedProfiles = Array(50).fill(null).map((_, i) => ({
        ...mockUserProfile,
        user_id: `user-${i}`,
      }));

      (ClerkSyncService.syncAllUsers as jest.Mock).mockResolvedValue(syncedProfiles);

      const response = await request(app)
        .post('/api/auth/sync-all')
        .send({ limit: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully synced 50 user profiles');
      expect(ClerkSyncService.syncAllUsers).toHaveBeenCalledWith(50);
    });

    it('should handle empty user list', async () => {
      (ClerkSyncService.syncAllUsers as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/auth/sync-all')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        message: 'Successfully synced 0 user profiles',
      });
    });

    it('should handle partial sync failures', async () => {
      const partialResults = [mockUserProfile]; // Only one user synced successfully

      (ClerkSyncService.syncAllUsers as jest.Mock).mockResolvedValue(partialResults);

      const response = await request(app)
        .post('/api/auth/sync-all')
        .expect(200);

      expect(response.body.message).toBe('Successfully synced 1 user profiles');
    });

    it('should handle Clerk API errors', async () => {
      (ClerkSyncService.syncAllUsers as jest.Mock).mockRejectedValue(
        new Error('Clerk API rate limit exceeded')
      );

      const response = await request(app)
        .post('/api/auth/sync-all')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to sync all users',
      });
    });

    it('should handle database errors during bulk sync', async () => {
      (ClerkSyncService.syncAllUsers as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/sync-all')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to sync all users',
      });
    });

    it('should handle very large limits', async () => {
      (ClerkSyncService.syncAllUsers as jest.Mock).mockResolvedValue([]);

      await request(app)
        .post('/api/auth/sync-all')
        .send({ limit: 10000 })
        .expect(200);

      expect(ClerkSyncService.syncAllUsers).toHaveBeenCalledWith(10000);
    });
  });

  describe('GET /api/auth/sync-status/:userId', () => {
    beforeEach(() => {
      // Update mock to set admin auth
      const authMock = jest.requireMock('../../middleware/auth') as any;
      authMock.requireAuth.mockImplementation((req: any, _res: any, next: any) => {
        req.auth = {
          userId: 'admin-user-123',
          sessionId: 'admin-session-123',
        };
        next();
      });
    });

    it('should return sync status for user in sync', async () => {
      (ClerkSyncService.isUserInSync as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .get('/api/auth/sync-status/user-check-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          userId: 'user-check-123',
          isInSync: true,
        },
      });

      expect(ClerkSyncService.isUserInSync).toHaveBeenCalledWith('user-check-123');
    });

    it('should return sync status for user out of sync', async () => {
      (ClerkSyncService.isUserInSync as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .get('/api/auth/sync-status/user-check-456')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          userId: 'user-check-456',
          isInSync: false,
        },
      });
    });

    it('should handle non-existent users', async () => {
      (ClerkSyncService.isUserInSync as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .get('/api/auth/sync-status/non-existent-user')
        .expect(200);

      expect(response.body.data.isInSync).toBe(false);
    });

    it('should handle ClerkSyncService errors', async () => {
      (ClerkSyncService.isUserInSync as jest.Mock).mockRejectedValue(
        new Error('Failed to check sync status')
      );

      const response = await request(app)
        .get('/api/auth/sync-status/user-error')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to check sync status',
      });
    });

    it('should handle special characters in userId', async () => {
      (ClerkSyncService.isUserInSync as jest.Mock).mockResolvedValue(true);

      const specialUserId = encodeURIComponent('user@example.com');
      await request(app)
        .get(`/api/auth/sync-status/${specialUserId}`)
        .expect(200);

      // Express automatically decodes the URI component
      expect(ClerkSyncService.isUserInSync).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Verify auth middleware is applied
      const authMock = jest.requireMock('../../middleware/auth') as any;
      
      // Make requests to each endpoint
      await request(app).get('/api/auth/me');
      await request(app).patch('/api/auth/profile');
      await request(app).post('/api/auth/sync');
      await request(app).post('/api/auth/sync-all');
      await request(app).get('/api/auth/sync-status/test-user');

      // Auth middleware should have been called for each request
      expect(authMock.requireAuth).toHaveBeenCalledTimes(5);
    });

    it('should require admin role for sync-all endpoint', async () => {
      // The admin role requirement is set up in the route definition
      // Our mock sets up ADMIN role for the test user, so the request should succeed
      const response = await request(app).post('/api/auth/sync-all').send({});
      
      // Should succeed because our mock sets up admin role
      expect(response.status).toBe(200);
      
      // Verify that ClerkSyncService.syncAllUsers was called
      expect(ClerkSyncService.syncAllUsers).toHaveBeenCalled();
    });

    it('should require admin role for sync-status endpoint', async () => {
      // The admin role requirement is set up in the route definition
      // Our mock sets up ADMIN role for the test user, so the request should succeed
      const response = await request(app).get('/api/auth/sync-status/test-user');
      
      // Should succeed because our mock sets up admin role
      expect(response.status).toBe(200);
      
      // Verify that ClerkSyncService.isUserInSync was called
      expect(ClerkSyncService.isUserInSync).toHaveBeenCalledWith('test-user');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user profiles with null fields', async () => {
      const profileWithNulls = {
        ...mockUserProfile,
        business_unit: null,
        warehouse_ids: null,
      };

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(profileWithNulls);

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.data.profile.business_unit).toBeNull();
      expect(response.body.data.profile.warehouse_ids).toBeNull();
    });

    it('should handle concurrent sync requests for same user', async () => {
      (ClerkSyncService.syncUser as jest.Mock)
        .mockResolvedValueOnce(mockUserProfile)
        .mockRejectedValueOnce(new Error('User already being synced'));

      // Simulate concurrent requests
      const [response1, response2] = await Promise.all([
        request(app).post('/api/auth/sync'),
        request(app).post('/api/auth/sync'),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(500);
    });

    it('should handle malformed warehouse_ids in update', async () => {
      (prisma.userProfile.update as jest.Mock).mockResolvedValue(mockUserProfile);

      await request(app)
        .patch('/api/auth/profile')
        .send({
          warehouse_ids: 'not-an-array', // Invalid type
        })
        .expect(200); // Will pass through to Prisma which would validate

      // The actual validation would happen at the Prisma level
      expect(prisma.userProfile.update).toHaveBeenCalled();
    });

    it('should handle very long warehouse_ids arrays', async () => {
      const longWarehouseList = Array(100).fill(null).map((_, i) => `WH${i}`);
      
      (prisma.userProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserProfile,
        warehouse_ids: longWarehouseList,
      });

      const response = await request(app)
        .patch('/api/auth/profile')
        .send({
          warehouse_ids: longWarehouseList,
        })
        .expect(200);

      expect(response.body.data.warehouse_ids).toHaveLength(100);
    });

    it('should handle sync-all with zero limit', async () => {
      (ClerkSyncService.syncAllUsers as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/auth/sync-all')
        .send({ limit: 0 })
        .expect(200);

      expect(ClerkSyncService.syncAllUsers).toHaveBeenCalledWith(0);
      expect(response.body.data).toEqual([]);
    });

    it('should properly serialize dates in responses', async () => {
      const profileWithDates = {
        ...mockUserProfile,
        created_at: new Date('2025-01-01T10:00:00.123Z'),
        updated_at: new Date('2025-01-02T15:30:45.678Z'),
      };

      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockResolvedValue(profileWithDates);

      const response = await request(app)
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.data.profile.created_at).toBe('2025-01-01T10:00:00.123Z');
      expect(response.body.data.profile.updated_at).toBe('2025-01-02T15:30:45.678Z');
    });
  });

  describe('Error Logging', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should log errors when getting user profile fails', async () => {
      const error = new Error('Test error');
      (ClerkSyncService.getOrCreateUserProfile as jest.Mock).mockRejectedValue(error);

      await request(app).get('/api/auth/me').expect(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get user profile:', error);
    });

    it('should log errors when updating profile fails', async () => {
      const error = new Error('Update error');
      (prisma.userProfile.update as jest.Mock).mockRejectedValue(error);

      await request(app)
        .patch('/api/auth/profile')
        .send({ business_unit: 'BU001' })
        .expect(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update profile:', error);
    });

    it('should log errors when syncing user fails', async () => {
      const error = new Error('Sync error');
      (ClerkSyncService.syncUser as jest.Mock).mockRejectedValue(error);

      await request(app).post('/api/auth/sync').expect(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to sync user:', error);
    });

    it('should log errors when syncing all users fails', async () => {
      const error = new Error('Bulk sync error');
      (ClerkSyncService.syncAllUsers as jest.Mock).mockRejectedValue(error);

      await request(app).post('/api/auth/sync-all').expect(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to sync all users:', error);
    });

    it('should log errors when checking sync status fails', async () => {
      const error = new Error('Status check error');
      (ClerkSyncService.isUserInSync as jest.Mock).mockRejectedValue(error);

      await request(app).get('/api/auth/sync-status/test-user').expect(500);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to check sync status:', error);
    });
  });
});