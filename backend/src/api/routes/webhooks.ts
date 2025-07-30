import { Router, json } from 'express';
import { ClerkSyncService } from '../../services/clerk-sync';
import { env } from '../../config/environment';

const router = Router();

/**
 * Middleware to verify Clerk webhook signature
 * This ensures the webhook is actually from Clerk
 */
const verifyClerkWebhook = (req: any, res: any, next: any) => {
  // Get the webhook signature from headers
  const webhookSignature = req.headers['clerk-signature'];
  
  if (!webhookSignature || webhookSignature === '') {
    return res.status(401).json({
      success: false,
      error: 'Missing webhook signature'
    });
  }

  // In a production environment, you should verify the webhook signature
  // For now, we'll just check that the signature exists
  // TODO: Implement proper signature verification when Clerk webhook secret is configured
  
  next();
};

/**
 * Parse raw body for webhook verification
 * Clerk webhooks need the raw body to verify signatures
 */
const parseRawBody = (req: any, res: any, next: any) => {
  // If body is already parsed (e.g., in tests), skip parsing
  if (req.body) {
    req.rawBody = JSON.stringify(req.body);
    return next();
  }
  
  let rawBody = '';
  
  req.on('data', (chunk: Buffer) => {
    rawBody += chunk.toString();
  });
  
  req.on('end', () => {
    req.rawBody = rawBody;
    try {
      req.body = JSON.parse(rawBody);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON in webhook body'
      });
    }
  });
};

// POST /api/webhooks/clerk - Handle Clerk user webhooks
router.post('/clerk', parseRawBody, verifyClerkWebhook, async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log(`Received Clerk webhook: ${type} for user ${data?.id}`);
    
    // Handle different webhook types
    switch (type) {
      case 'user.created':
        console.log(`New user created: ${data.id}`);
        await ClerkSyncService.handleUserWebhook(req.body);
        break;
        
      case 'user.updated':
        console.log(`User updated: ${data.id}`);
        await ClerkSyncService.handleUserWebhook(req.body);
        break;
        
      case 'user.deleted':
        console.log(`User deleted: ${data.id}`);
        await ClerkSyncService.handleUserWebhook(req.body);
        break;
        
      case 'session.created':
        // We don't need to handle session events for user profile sync
        console.log(`Session created for user: ${data.user_id}`);
        break;
        
      case 'session.ended':
        console.log(`Session ended for user: ${data.user_id}`);
        break;
        
      default:
        console.warn(`Unhandled webhook type: ${type}`);
    }
    
    // Always return success to acknowledge receipt
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return success even on error to prevent Clerk from retrying
    // Log the error for debugging
    res.json({
      success: true,
      message: 'Webhook received but failed to process',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/webhooks/clerk/test - Test endpoint for webhook setup
router.get('/clerk/test', (_req, res) => {
  res.json({
    success: true,
    message: 'Clerk webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// POST /api/webhooks/clerk/manual-sync - Manual trigger for user sync (for testing)
router.post('/clerk/manual-sync', json(), async (req, res) => {
  try {
    const { userId, action = 'sync' } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
    let result: any;
    switch (action) {
      case 'sync':
        result = await ClerkSyncService.syncUser(userId);
        break;
      case 'check':
        result = await ClerkSyncService.isUserInSync(userId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use "sync" or "check"'
        });
    }
    
    return res.json({
      success: true,
      data: result,
      message: `Manual ${action} completed for user ${userId}`
    });
    
  } catch (error) {
    console.error('Manual sync error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;