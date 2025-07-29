import { Request, Response, NextFunction } from 'express';
// import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node'; // TODO: Enable when auth is implemented

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
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  // Skip auth for development
  req.auth = {
    userId: 'dev-user-123',
    sessionId: 'dev-session-123'
  };
  next();
};

// Custom middleware to check user roles (after Clerk auth)
export const requireRole = (_roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // TODO: Fetch user profile and check role
    // For now, we'll pass through
    next();
  };
};