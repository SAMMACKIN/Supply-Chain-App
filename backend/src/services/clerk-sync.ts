import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../db/client';
import { 
  mapClerkRoleToUserRole,
  extractBusinessUnit,
  extractWarehouseIds,
  createDefaultUserProfile,
  ClerkUserMetadata
} from '../utils/role-mapping';

/**
 * Service for synchronizing Clerk users with local user profiles
 */
export class ClerkSyncService {
  /**
   * Syncs a single user from Clerk to local database
   * @param userId - Clerk user ID
   * @returns Promise resolving to user profile
   */
  static async syncUser(userId: string) {
    try {
      // Get user from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      if (!clerkUser) {
        throw new Error(`User not found in Clerk: ${userId}`);
      }

      // Extract metadata from Clerk user
      const metadata: ClerkUserMetadata = {
        role: clerkUser.privateMetadata?.role as string,
        businessUnit: clerkUser.privateMetadata?.businessUnit as string,
        warehouseIds: clerkUser.privateMetadata?.warehouseIds as string[]
      };

      // Check if user profile already exists
      let userProfile = await prisma.userProfile.findUnique({
        where: { user_id: userId }
      });

      if (userProfile) {
        // Update existing profile
        userProfile = await prisma.userProfile.update({
          where: { user_id: userId },
          data: {
            role: mapClerkRoleToUserRole(metadata.role),
            business_unit: extractBusinessUnit(metadata),
            warehouse_ids: extractWarehouseIds(metadata),
            updated_at: new Date()
          }
        });
      } else {
        // Create new profile
        const profileData = createDefaultUserProfile(userId, metadata);
        userProfile = await prisma.userProfile.create({
          data: profileData
        });
      }

      return userProfile;
    } catch (error) {
      console.error(`Failed to sync user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Syncs all users from Clerk to local database
   * @param limit - Maximum number of users to sync (default: 100)
   * @returns Promise resolving to array of synced user profiles
   */
  static async syncAllUsers(limit: number = 100) {
    try {
      const clerkUsers = await clerkClient.users.getUserList({
        limit
      });

      const syncPromises = clerkUsers.map((user: any) => 
        this.syncUser(user.id).catch(error => {
          console.error(`Failed to sync user ${user.id}:`, error);
          return null;
        })
      );

      const results = await Promise.all(syncPromises);
      return results.filter(Boolean); // Remove null values from failed syncs
    } catch (error) {
      console.error('Failed to sync all users:', error);
      throw error;
    }
  }

  /**
   * Creates or updates a user profile from Clerk webhook data
   * @param webhookData - Data from Clerk webhook
   * @returns Promise resolving to user profile
   */
  static async handleUserWebhook(webhookData: any) {
    const { type, data } = webhookData;
    const userId = data.id;

    try {
      switch (type) {
        case 'user.created':
        case 'user.updated':
          return await this.syncUser(userId);

        case 'user.deleted':
          // Soft delete - we don't actually delete user profiles to preserve audit trail
          // Instead, we could mark them as inactive if we add an is_active field
          console.log(`User deleted in Clerk: ${userId}`);
          // For now, we don't delete the profile to preserve call-off history
          return null;

        default:
          console.warn(`Unhandled webhook type: ${type}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to handle webhook for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Validates if a user profile exists and is in sync with Clerk
   * @param userId - Clerk user ID
   * @returns Promise resolving to boolean indicating if profile is in sync
   */
  static async isUserInSync(userId: string): Promise<boolean> {
    try {
      const [clerkUser, localProfile] = await Promise.all([
        clerkClient.users.getUser(userId),
        prisma.userProfile.findUnique({ where: { user_id: userId } })
      ]);

      if (!clerkUser || !localProfile) {
        return false;
      }

      const clerkMetadata: ClerkUserMetadata = {
        role: clerkUser.privateMetadata?.role as string,
        businessUnit: clerkUser.privateMetadata?.businessUnit as string,
        warehouseIds: clerkUser.privateMetadata?.warehouseIds as string[]
      };

      const expectedRole = mapClerkRoleToUserRole(clerkMetadata.role);
      const expectedBusinessUnit = extractBusinessUnit(clerkMetadata);
      const expectedWarehouseIds = extractWarehouseIds(clerkMetadata);

      return (
        localProfile.role === expectedRole &&
        localProfile.business_unit === expectedBusinessUnit &&
        JSON.stringify(localProfile.warehouse_ids.sort()) === 
        JSON.stringify(expectedWarehouseIds.sort())
      );
    } catch (error) {
      console.error(`Failed to check sync status for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Gets user profile, creating it if it doesn't exist
   * @param userId - Clerk user ID
   * @returns Promise resolving to user profile
   */
  static async getOrCreateUserProfile(userId: string) {
    let userProfile = await prisma.userProfile.findUnique({
      where: { user_id: userId }
    });

    if (!userProfile) {
      userProfile = await this.syncUser(userId);
    }

    return userProfile;
  }
}