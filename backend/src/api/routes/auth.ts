import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { ClerkSyncService } from '../../services/clerk-sync';
import { prisma } from '../../db/client';

const router = Router();

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.auth!.userId;
    
    // Get or create user profile (this will sync with Clerk if needed)
    const profile = await ClerkSyncService.getOrCreateUserProfile(userId);
    
    res.json({
      success: true,
      data: {
        user_id: userId,
        profile,
      },
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile'
    });
  }
});

// PATCH /api/auth/profile - Update user profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const { business_unit, warehouse_ids } = req.body;
    
    const profile = await prisma.userProfile.update({
      where: { user_id: userId },
      data: {
        business_unit,
        warehouse_ids,
      },
    });
    
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

// POST /api/auth/sync - Sync current user with Clerk
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.auth!.userId;
    const profile = await ClerkSyncService.syncUser(userId);
    
    res.json({
      success: true,
      data: profile,
      message: 'User profile synced successfully'
    });
  } catch (error) {
    console.error('Failed to sync user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync user profile'
    });
  }
});

// POST /api/auth/sync-all - Sync all users (admin only)
router.post('/sync-all', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { limit = 100 } = req.body;
    const profiles = await ClerkSyncService.syncAllUsers(limit);
    
    res.json({
      success: true,
      data: profiles,
      message: `Successfully synced ${profiles.length} user profiles`
    });
  } catch (error) {
    console.error('Failed to sync all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync all users'
    });
  }
});

// GET /api/auth/sync-status/:userId - Check if user is in sync (admin only)
router.get('/sync-status/:userId', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userId } = req.params;
    const isInSync = await ClerkSyncService.isUserInSync(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        isInSync
      }
    });
  } catch (error) {
    console.error('Failed to check sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check sync status'
    });
  }
});

export default router;