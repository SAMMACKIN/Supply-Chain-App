import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../../db/client';

const router = Router();

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  const userId = req.auth!.userId;
  
  // Try to get user profile
  let profile = await prisma.userProfile.findUnique({
    where: { user_id: userId },
  });
  
  // Create profile if it doesn't exist
  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        user_id: userId,
        role: 'OPS', // Default role
        business_unit: 'BU001', // Default business unit
        warehouse_ids: [],
      },
    });
  }
  
  res.json({
    success: true,
    data: {
      user_id: userId,
      profile,
    },
  });
});

// PATCH /api/auth/profile - Update user profile
router.patch('/profile', requireAuth, async (req, res) => {
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
});

export default router;