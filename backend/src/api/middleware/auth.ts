import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Extend Express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        claims?: any;
      };
    }
  }
}

// Clerk authentication middleware - DISABLED FOR NOW
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip auth for development
  req.auth = {
    userId: 'dev-user-123',
    sessionId: 'dev-session-123'
  };
  next();
};

// Custom middleware to check user roles (after Clerk auth)
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // TODO: Fetch user profile and check role
    // For now, we'll pass through
    next();
  };
};