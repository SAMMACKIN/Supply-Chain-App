import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ClerkSyncService } from '../../services/clerk-sync';
import { env } from '../../config/environment';

// Extend Express Request type to include auth and user profile
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        claims?: any;
      };
      userProfile?: {
        user_id: string;
        role: string;
        business_unit: string;
        warehouse_ids: string[];
        created_at: Date;
        updated_at: Date;
      };
    }
  }
}

// Authentication middleware (supports both Clerk and Mock modes)
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if Clerk is configured
    if (!env.CLERK_SECRET_KEY) {
      // Mock auth mode - skip authentication and use dev user
      console.log('🔄 Using mock authentication (Clerk not configured)');
      
      const mockUserId = '00000000-0000-0000-0000-000000000000';
      const mockSessionId = 'sess_mock_dev_session';
      
      // Add mock auth info to request
      req.auth = {
        userId: mockUserId,
        sessionId: mockSessionId,
        claims: {
          id: mockSessionId,
          userId: mockUserId,
          status: 'active'
        }
      };

      next();
      return;
    }

    // Clerk auth mode - require proper authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(sessionToken, env.CLERK_SECRET_KEY);

    if (!session || !session.userId) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session token'
      });
      return;
    }

    // Ensure user profile exists in our database
    await ClerkSyncService.getOrCreateUserProfile(session.userId);

    // Add auth info to request
    req.auth = {
      userId: session.userId,
      sessionId: session.id,
      claims: session
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Custom middleware to check user roles (supports both Clerk and Mock modes)
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    try {
      // Check if we're in mock auth mode
      if (!env.CLERK_SECRET_KEY && req.auth.userId === '00000000-0000-0000-0000-000000000000') {
        // Mock auth mode - use mock user profile
        console.log('🔄 Using mock role authorization (Clerk not configured)');
        
        const mockUserProfile = {
          user_id: '00000000-0000-0000-0000-000000000000',
          role: 'OPS', // Default role for dev user
          business_unit: 'DEV',
          warehouse_ids: ['WH001'],
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-01T00:00:00Z'),
        };

        // Add mock user profile to request
        req.userProfile = mockUserProfile;
        next();
        return;
      }

      // Clerk auth mode - fetch real user profile from database
      const userProfile = await ClerkSyncService.getOrCreateUserProfile(req.auth.userId);
      
      if (!userProfile) {
        res.status(403).json({
          success: false,
          error: 'User profile not found'
        });
        return;
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userProfile.role)) {
        res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
        return;
      }

      // Add user profile to request for use in route handlers
      req.userProfile = userProfile;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify user permissions'
      });
    }
  };
};