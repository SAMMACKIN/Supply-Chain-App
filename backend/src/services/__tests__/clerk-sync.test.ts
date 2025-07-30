import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../../db/client';
import { ClerkSyncService } from '../clerk-sync';
import { UserRole } from '@prisma/client';
import {
  mapClerkRoleToUserRole,
  extractBusinessUnit,
  extractWarehouseIds,
  createDefaultUserProfile,
} from '../../utils/role-mapping';

// Mock dependencies
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
      getUserList: jest.fn(),
    },
  },
}));

jest.mock('../../db/client', () => ({
  prisma: {
    userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../utils/role-mapping', () => ({
  mapClerkRoleToUserRole: jest.fn(),
  extractBusinessUnit: jest.fn(),
  extractWarehouseIds: jest.fn(),
  createDefaultUserProfile: jest.fn(),
}));

describe('ClerkSyncService', () => {
  // Sample test data
  const mockClerkUser = {
    id: 'user_test123',
    privateMetadata: {
      role: 'ops',
      businessUnit: 'BU002',
      warehouseIds: ['WH001', 'WH002'],
    },
  };

  const mockUserProfile = {
    user_id: 'user_test123',
    role: UserRole.OPS,
    business_unit: 'BU002',
    warehouse_ids: ['WH001', 'WH002'],
    created_at: new Date('2025-01-01T10:00:00Z'),
    updated_at: new Date('2025-01-01T10:00:00Z'),
  };

  const mockDefaultProfileData = {
    user_id: 'user_test123',
    role: UserRole.OPS,
    business_unit: 'BU002',
    warehouse_ids: ['WH001', 'WH002'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
    (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
    (extractWarehouseIds as jest.Mock).mockReturnValue(['WH001', 'WH002']);
    (createDefaultUserProfile as jest.Mock).mockReturnValue(mockDefaultProfileData);
  });

  describe('syncUser', () => {
    describe('Positive scenarios', () => {
      it('should successfully sync a new user from Clerk', async () => {
        // Mock Clerk API returns user
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        
        // Mock no existing user profile
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
        
        // Mock successful creation
        (prisma.userProfile.create as jest.Mock).mockResolvedValue(mockUserProfile);

        const result = await ClerkSyncService.syncUser('user_test123');

        expect(result).toEqual(mockUserProfile);
        expect(clerkClient.users.getUser).toHaveBeenCalledWith('user_test123');
        expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
          where: { user_id: 'user_test123' },
        });
        expect(prisma.userProfile.create).toHaveBeenCalledWith({
          data: mockDefaultProfileData,
        });
        expect(mapClerkRoleToUserRole).toHaveBeenCalledWith('ops');
        expect(extractBusinessUnit).toHaveBeenCalledWith({
          role: 'ops',
          businessUnit: 'BU002',
          warehouseIds: ['WH001', 'WH002'],
        });
        expect(extractWarehouseIds).toHaveBeenCalledWith({
          role: 'ops',
          businessUnit: 'BU002',
          warehouseIds: ['WH001', 'WH002'],
        });
      });

      it('should successfully update an existing user profile', async () => {
        // Mock Clerk API returns user
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        
        // Mock existing user profile
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
        
        // Mock successful update
        const updatedProfile = { ...mockUserProfile, updated_at: new Date() };
        (prisma.userProfile.update as jest.Mock).mockResolvedValue(updatedProfile);

        const result = await ClerkSyncService.syncUser('user_test123');

        expect(result).toEqual(updatedProfile);
        expect(prisma.userProfile.update).toHaveBeenCalledWith({
          where: { user_id: 'user_test123' },
          data: {
            role: UserRole.OPS,
            business_unit: 'BU002',
            warehouse_ids: ['WH001', 'WH002'],
            updated_at: expect.any(Date),
          },
        });
        expect(prisma.userProfile.create).not.toHaveBeenCalled();
      });

      it('should handle user with minimal metadata', async () => {
        const minimalClerkUser = {
          id: 'user_minimal',
          privateMetadata: {},
        };

        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(minimalClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.READ_ONLY);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU001');
        (extractWarehouseIds as jest.Mock).mockReturnValue([]);
        
        const minimalProfileData = {
          user_id: 'user_minimal',
          role: UserRole.READ_ONLY,
          business_unit: 'BU001',
          warehouse_ids: [],
        };
        (createDefaultUserProfile as jest.Mock).mockReturnValue(minimalProfileData);
        (prisma.userProfile.create as jest.Mock).mockResolvedValue({
          ...minimalProfileData,
          created_at: new Date(),
          updated_at: new Date(),
        });

        const result = await ClerkSyncService.syncUser('user_minimal');

        expect(result.role).toBe(UserRole.READ_ONLY);
        expect(result.business_unit).toBe('BU001');
        expect(result.warehouse_ids).toEqual([]);
      });

      it('should handle user with no privateMetadata', async () => {
        const userWithoutMetadata = {
          id: 'user_no_metadata',
          // No privateMetadata field at all
        };

        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(userWithoutMetadata);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.userProfile.create as jest.Mock).mockResolvedValue({
          user_id: 'user_no_metadata',
          role: UserRole.READ_ONLY,
          business_unit: 'BU001',
          warehouse_ids: [],
          created_at: new Date(),
          updated_at: new Date(),
        });

        const result = await ClerkSyncService.syncUser('user_no_metadata');

        expect(result).toBeDefined();
        expect(mapClerkRoleToUserRole).toHaveBeenCalledWith(undefined);
      });
    });

    describe('Negative scenarios', () => {
      it('should throw error when user not found in Clerk', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(null);

        await expect(ClerkSyncService.syncUser('non_existent_user'))
          .rejects.toThrow('User not found in Clerk: non_existent_user');

        expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
        expect(prisma.userProfile.create).not.toHaveBeenCalled();
        expect(prisma.userProfile.update).not.toHaveBeenCalled();
      });

      it('should throw error when Clerk API fails', async () => {
        const clerkError = new Error('Clerk API error');
        (clerkClient.users.getUser as jest.Mock).mockRejectedValue(clerkError);

        await expect(ClerkSyncService.syncUser('user_test123'))
          .rejects.toThrow('Clerk API error');
      });

      it('should throw error when database findUnique fails', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database connection error')
        );

        await expect(ClerkSyncService.syncUser('user_test123'))
          .rejects.toThrow('Database connection error');
      });

      it('should throw error when database create fails', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.userProfile.create as jest.Mock).mockRejectedValue(
          new Error('Unique constraint violation')
        );

        await expect(ClerkSyncService.syncUser('user_test123'))
          .rejects.toThrow('Unique constraint violation');
      });

      it('should throw error when database update fails', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
        (prisma.userProfile.update as jest.Mock).mockRejectedValue(
          new Error('Update failed')
        );

        await expect(ClerkSyncService.syncUser('user_test123'))
          .rejects.toThrow('Update failed');
      });
    });

    describe('Edge cases', () => {
      it('should handle rate limiting gracefully', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).status = 429;
        (clerkClient.users.getUser as jest.Mock).mockRejectedValue(rateLimitError);

        await expect(ClerkSyncService.syncUser('user_test123'))
          .rejects.toThrow('Rate limit exceeded');
      });

      it('should handle concurrent sync attempts', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.userProfile.create as jest.Mock)
          .mockResolvedValueOnce(mockUserProfile)
          .mockRejectedValueOnce(new Error('Unique constraint violation'));

        // Simulate concurrent calls
        const results = await Promise.allSettled([
          ClerkSyncService.syncUser('user_test123'),
          ClerkSyncService.syncUser('user_test123'),
        ]);

        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('rejected');
      });
    });
  });

  describe('syncAllUsers', () => {
    describe('Positive scenarios', () => {
      it('should sync all users successfully', async () => {
        const mockClerkUsers = [
          { id: 'user1', privateMetadata: { role: 'ops' } },
          { id: 'user2', privateMetadata: { role: 'admin' } },
          { id: 'user3', privateMetadata: { role: 'trade' } },
        ];

        (clerkClient.users.getUserList as jest.Mock).mockResolvedValue(mockClerkUsers);

        // Mock syncUser to succeed for all users
        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValueOnce({ ...mockUserProfile, user_id: 'user1' } as any)
          .mockResolvedValueOnce({ ...mockUserProfile, user_id: 'user2' } as any)
          .mockResolvedValueOnce({ ...mockUserProfile, user_id: 'user3' } as any);

        const results = await ClerkSyncService.syncAllUsers();

        expect(results).toHaveLength(3);
        expect(clerkClient.users.getUserList).toHaveBeenCalledWith({ limit: 100 });
        expect(syncUserSpy).toHaveBeenCalledTimes(3);
        
        syncUserSpy.mockRestore();
      });

      it('should sync with custom limit', async () => {
        const mockClerkUsers = Array(50).fill(null).map((_, i) => ({
          id: `user${i}`,
          privateMetadata: { role: 'ops' },
        }));

        (clerkClient.users.getUserList as jest.Mock).mockResolvedValue(mockClerkUsers);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        const results = await ClerkSyncService.syncAllUsers(50);

        expect(results).toHaveLength(50);
        expect(clerkClient.users.getUserList).toHaveBeenCalledWith({ limit: 50 });
        
        syncUserSpy.mockRestore();
      });

      it('should handle partial failures gracefully', async () => {
        const mockClerkUsers = [
          { id: 'user1', privateMetadata: { role: 'ops' } },
          { id: 'user2', privateMetadata: { role: 'admin' } },
          { id: 'user3', privateMetadata: { role: 'trade' } },
        ];

        (clerkClient.users.getUserList as jest.Mock).mockResolvedValue(mockClerkUsers);

        // Mock syncUser to fail for user2
        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValueOnce({ ...mockUserProfile, user_id: 'user1' } as any)
          .mockRejectedValueOnce(new Error('Sync failed for user2'))
          .mockResolvedValueOnce({ ...mockUserProfile, user_id: 'user3' } as any);

        const results = await ClerkSyncService.syncAllUsers();

        expect(results).toHaveLength(2); // Only successful syncs
        expect(results[0]?.user_id).toBe('user1');
        expect(results[1]?.user_id).toBe('user3');
        
        syncUserSpy.mockRestore();
      });

      it('should handle empty user list', async () => {
        (clerkClient.users.getUserList as jest.Mock).mockResolvedValue([]);

        const results = await ClerkSyncService.syncAllUsers();

        expect(results).toHaveLength(0);
        expect(results).toEqual([]);
      });
    });

    describe('Negative scenarios', () => {
      it('should throw error when getUserList fails', async () => {
        (clerkClient.users.getUserList as jest.Mock).mockRejectedValue(
          new Error('Clerk API error')
        );

        await expect(ClerkSyncService.syncAllUsers())
          .rejects.toThrow('Clerk API error');
      });

      it('should handle rate limiting on bulk sync', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).status = 429;
        (clerkClient.users.getUserList as jest.Mock).mockRejectedValue(rateLimitError);

        await expect(ClerkSyncService.syncAllUsers())
          .rejects.toThrow('Rate limit exceeded');
      });
    });

    describe('Edge cases', () => {
      it('should handle very large user lists', async () => {
        const largeUserList = Array(1000).fill(null).map((_, i) => ({
          id: `user${i}`,
          privateMetadata: { role: 'ops' },
        }));

        (clerkClient.users.getUserList as jest.Mock).mockResolvedValue(largeUserList);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        const results = await ClerkSyncService.syncAllUsers(1000);

        expect(results).toHaveLength(1000);
        expect(syncUserSpy).toHaveBeenCalledTimes(1000);
        
        syncUserSpy.mockRestore();
      });

      it('should handle all syncs failing', async () => {
        const mockClerkUsers = [
          { id: 'user1', privateMetadata: { role: 'ops' } },
          { id: 'user2', privateMetadata: { role: 'admin' } },
        ];

        (clerkClient.users.getUserList as jest.Mock).mockResolvedValue(mockClerkUsers);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockRejectedValue(new Error('Sync failed'));

        const results = await ClerkSyncService.syncAllUsers();

        expect(results).toHaveLength(0);
        expect(results).toEqual([]);
        
        syncUserSpy.mockRestore();
      });
    });
  });

  describe('handleUserWebhook', () => {
    describe('Positive scenarios', () => {
      it('should handle user.created webhook', async () => {
        const webhookData = {
          type: 'user.created',
          data: { id: 'user_new123' },
        };

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        const result = await ClerkSyncService.handleUserWebhook(webhookData);

        expect(result).toEqual(mockUserProfile);
        expect(syncUserSpy).toHaveBeenCalledWith('user_new123');
        
        syncUserSpy.mockRestore();
      });

      it('should handle user.updated webhook', async () => {
        const webhookData = {
          type: 'user.updated',
          data: { id: 'user_update123' },
        };

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        const result = await ClerkSyncService.handleUserWebhook(webhookData);

        expect(result).toEqual(mockUserProfile);
        expect(syncUserSpy).toHaveBeenCalledWith('user_update123');
        
        syncUserSpy.mockRestore();
      });

      it('should handle user.deleted webhook without deleting profile', async () => {
        const webhookData = {
          type: 'user.deleted',
          data: { id: 'user_deleted123' },
        };

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await ClerkSyncService.handleUserWebhook(webhookData);

        expect(result).toBeNull();
        expect(consoleLogSpy).toHaveBeenCalledWith('User deleted in Clerk: user_deleted123');
        
        consoleLogSpy.mockRestore();
      });

      it('should handle unrecognized webhook types', async () => {
        const webhookData = {
          type: 'user.custom_event',
          data: { id: 'user_test123' },
        };

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await ClerkSyncService.handleUserWebhook(webhookData);

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Unhandled webhook type: user.custom_event');
        
        consoleWarnSpy.mockRestore();
      });
    });

    describe('Negative scenarios', () => {
      it('should throw error when sync fails for user.created', async () => {
        const webhookData = {
          type: 'user.created',
          data: { id: 'user_fail123' },
        };

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockRejectedValue(new Error('Sync failed'));

        await expect(ClerkSyncService.handleUserWebhook(webhookData))
          .rejects.toThrow('Sync failed');
        
        syncUserSpy.mockRestore();
      });

      it('should throw error when sync fails for user.updated', async () => {
        const webhookData = {
          type: 'user.updated',
          data: { id: 'user_fail123' },
        };

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockRejectedValue(new Error('Database error'));

        await expect(ClerkSyncService.handleUserWebhook(webhookData))
          .rejects.toThrow('Database error');
        
        syncUserSpy.mockRestore();
      });
    });

    describe('Edge cases', () => {
      it('should handle webhook data without id', async () => {
        const webhookData = {
          type: 'user.created',
          data: {}, // Missing id
        };

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        await ClerkSyncService.handleUserWebhook(webhookData);

        expect(syncUserSpy).toHaveBeenCalledWith(undefined);
        
        syncUserSpy.mockRestore();
      });

      it('should handle malformed webhook data', async () => {
        const webhookData = {
          type: 'user.created',
          // Missing data field
        };

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        await expect(ClerkSyncService.handleUserWebhook(webhookData))
          .rejects.toThrow();
        
        syncUserSpy.mockRestore();
      });
    });
  });

  describe('isUserInSync', () => {
    describe('Positive scenarios', () => {
      it('should return true when user is in sync', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
        (extractWarehouseIds as jest.Mock).mockReturnValue(['WH001', 'WH002']);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(true);
        expect(clerkClient.users.getUser).toHaveBeenCalledWith('user_test123');
        expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
          where: { user_id: 'user_test123' },
        });
      });

      it('should return false when role differs', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
          ...mockUserProfile,
          role: UserRole.ADMIN, // Different role
        });
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
        (extractWarehouseIds as jest.Mock).mockReturnValue(['WH001', 'WH002']);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
      });

      it('should return false when business unit differs', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
          ...mockUserProfile,
          business_unit: 'BU001', // Different business unit
        });
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
        (extractWarehouseIds as jest.Mock).mockReturnValue(['WH001', 'WH002']);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
      });

      it('should return false when warehouse IDs differ', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
          ...mockUserProfile,
          warehouse_ids: ['WH001'], // Different warehouse IDs
        });
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
        (extractWarehouseIds as jest.Mock).mockReturnValue(['WH001', 'WH002']);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
      });

      it('should handle warehouse IDs in different order', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
          ...mockUserProfile,
          warehouse_ids: ['WH002', 'WH001'], // Same IDs, different order
        });
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
        (extractWarehouseIds as jest.Mock).mockReturnValue(['WH001', 'WH002']);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(true); // Should be true because arrays contain same elements
      });
    });

    describe('Negative scenarios', () => {
      it('should return false when user not found in Clerk', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(null);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
      });

      it('should return false when user profile not found locally', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
      });

      it('should return false when Clerk API fails', async () => {
        (clerkClient.users.getUser as jest.Mock).mockRejectedValue(
          new Error('Clerk API error')
        );
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        consoleErrorSpy.mockRestore();
      });

      it('should return false when database query fails', async () => {
        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser);
        (prisma.userProfile.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        consoleErrorSpy.mockRestore();
      });
    });

    describe('Edge cases', () => {
      it('should handle empty warehouse arrays', async () => {
        const userWithNoWarehouses = {
          ...mockClerkUser,
          privateMetadata: {
            ...mockClerkUser.privateMetadata,
            warehouseIds: [],
          },
        };

        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(userWithNoWarehouses);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
          ...mockUserProfile,
          warehouse_ids: [],
        });
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.OPS);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU002');
        (extractWarehouseIds as jest.Mock).mockReturnValue([]);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(true);
      });

      it('should handle null/undefined metadata fields', async () => {
        const userWithNullMetadata = {
          id: 'user_test123',
          privateMetadata: {
            role: null,
            businessUnit: undefined,
            warehouseIds: null,
          },
        };

        (clerkClient.users.getUser as jest.Mock).mockResolvedValue(userWithNullMetadata);
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
          ...mockUserProfile,
          role: UserRole.READ_ONLY,
          business_unit: 'BU001',
          warehouse_ids: [],
        });
        (mapClerkRoleToUserRole as jest.Mock).mockReturnValue(UserRole.READ_ONLY);
        (extractBusinessUnit as jest.Mock).mockReturnValue('BU001');
        (extractWarehouseIds as jest.Mock).mockReturnValue([]);

        const result = await ClerkSyncService.isUserInSync('user_test123');

        expect(result).toBe(true);
      });
    });
  });

  describe('getOrCreateUserProfile', () => {
    describe('Positive scenarios', () => {
      it('should return existing user profile', async () => {
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser');

        const result = await ClerkSyncService.getOrCreateUserProfile('user_test123');

        expect(result).toEqual(mockUserProfile);
        expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
          where: { user_id: 'user_test123' },
        });
        expect(syncUserSpy).not.toHaveBeenCalled();
        
        syncUserSpy.mockRestore();
      });

      it('should create new user profile when not found', async () => {
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        const result = await ClerkSyncService.getOrCreateUserProfile('user_test123');

        expect(result).toEqual(mockUserProfile);
        expect(syncUserSpy).toHaveBeenCalledWith('user_test123');
        
        syncUserSpy.mockRestore();
      });
    });

    describe('Negative scenarios', () => {
      it('should throw error when database query fails', async () => {
        (prisma.userProfile.findUnique as jest.Mock).mockRejectedValue(
          new Error('Database connection error')
        );

        await expect(ClerkSyncService.getOrCreateUserProfile('user_test123'))
          .rejects.toThrow('Database connection error');
      });

      it('should throw error when sync fails for new user', async () => {
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockRejectedValue(new Error('Sync failed'));

        await expect(ClerkSyncService.getOrCreateUserProfile('user_test123'))
          .rejects.toThrow('Sync failed');
        
        syncUserSpy.mockRestore();
      });
    });

    describe('Edge cases', () => {
      it('should handle concurrent calls for same user', async () => {
        // First call finds no profile
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValueOnce(null);
        // Second call finds profile (created by first call)
        (prisma.userProfile.findUnique as jest.Mock).mockResolvedValueOnce(mockUserProfile);

        const syncUserSpy = jest.spyOn(ClerkSyncService, 'syncUser')
          .mockResolvedValue(mockUserProfile as any);

        const results = await Promise.all([
          ClerkSyncService.getOrCreateUserProfile('user_test123'),
          ClerkSyncService.getOrCreateUserProfile('user_test123'),
        ]);

        expect(results[0]).toEqual(mockUserProfile);
        expect(results[1]).toEqual(mockUserProfile);
        expect(syncUserSpy).toHaveBeenCalledTimes(1); // Only called once
        
        syncUserSpy.mockRestore();
      });
    });
  });

  describe('Console logging', () => {
    it('should log errors appropriately', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test error logging in syncUser
      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(new Error('Test error'));
      await expect(ClerkSyncService.syncUser('user_test123')).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to sync user user_test123:',
        expect.any(Error)
      );

      // Test log in handleUserWebhook for deleted user
      await ClerkSyncService.handleUserWebhook({
        type: 'user.deleted',
        data: { id: 'user_deleted' },
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('User deleted in Clerk: user_deleted');

      // Test warn for unhandled webhook type
      await ClerkSyncService.handleUserWebhook({
        type: 'user.unknown',
        data: { id: 'user_test' },
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unhandled webhook type: user.unknown');

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});