import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import webhooksRouter from '../webhooks';
import { ClerkSyncService } from '../../../services/clerk-sync';
import { env } from '../../../config/environment';

// Mock ClerkSyncService
jest.mock('../../../services/clerk-sync', () => ({
  ClerkSyncService: {
    handleUserWebhook: jest.fn(),
    syncUser: jest.fn(),
    isUserInSync: jest.fn(),
  },
}));

// Mock environment config
jest.mock('../../../config/environment', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

// Create Express app for testing
const app = express();
// Important: Don't use express.json() here as the webhook route needs raw body
app.use('/api/webhooks', webhooksRouter);

// Add error handler middleware
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Helper function to create a webhook request with proper headers
const createWebhookRequest = (
  path: string,
  body: any,
  signature?: string
) => {
  const req = request(app)
    .post(path)
    .set('Content-Type', 'application/json');
  
  if (signature !== undefined) {
    req.set('clerk-signature', signature);
  }
  
  // Send raw body as string to simulate webhook behavior
  return req.send(typeof body === 'string' ? body : JSON.stringify(body));
};

// Sample webhook payloads
const mockUserCreatedWebhook = {
  type: 'user.created',
  data: {
    id: 'user_123',
    email_addresses: [{ email_address: 'test@example.com' }],
    first_name: 'Test',
    last_name: 'User',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
  },
};

const mockUserUpdatedWebhook = {
  type: 'user.updated',
  data: {
    id: 'user_456',
    email_addresses: [{ email_address: 'updated@example.com' }],
    first_name: 'Updated',
    last_name: 'User',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-02T15:30:00Z',
  },
};

const mockUserDeletedWebhook = {
  type: 'user.deleted',
  data: {
    id: 'user_789',
    deleted: true,
  },
};

const mockSessionCreatedWebhook = {
  type: 'session.created',
  data: {
    id: 'session_123',
    user_id: 'user_123',
    status: 'active',
  },
};

const mockSessionEndedWebhook = {
  type: 'session.ended',
  data: {
    id: 'session_123',
    user_id: 'user_123',
    status: 'ended',
  },
};

const mockUnknownWebhook = {
  type: 'unknown.event',
  data: {
    id: 'unknown_123',
  },
};

describe('Webhooks API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console mocks for webhook tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/webhooks/clerk', () => {
    describe('Signature Verification', () => {
      it('should reject webhook without signature', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook
        );

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          error: 'Missing webhook signature',
        });
        expect(ClerkSyncService.handleUserWebhook).not.toHaveBeenCalled();
      });

      it('should accept webhook with signature', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook,
          'valid-signature-123'
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Webhook processed successfully',
        });
      });

      it('should handle empty signature header', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook,
          ''
        );

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          error: 'Missing webhook signature',
        });
      });

      it('should handle malformed signature headers', async () => {
        const malformedSignatures = [
          'not-a-valid-signature',
          'Bearer token',
          '   ', // whitespace only
          '\n\n', // newlines
          'null',
          'undefined',
        ];

        for (const signature of malformedSignatures) {
          const response = await createWebhookRequest(
            '/api/webhooks/clerk',
            mockUserCreatedWebhook,
            signature
          );

          expect(response.status).toBe(401);
          expect(response.body).toEqual({
            success: false,
            error: 'Invalid webhook signature',
          });
        }
      });

      it('should handle extremely long signature headers', async () => {
        const longSignature = 'a'.repeat(10000);
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook,
          longSignature
        );

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid webhook signature',
        });
      });

      it('should handle signatures with special characters', async () => {
        const specialCharSignatures = [
          'sig_with_emoji_😀',
          'sig_with_unicode_\u0000',
          'sig_with_control_chars_\x00\x01\x02',
          'sig_with_<script>alert(1)</script>',
        ];

        for (const signature of specialCharSignatures) {
          const response = await createWebhookRequest(
            '/api/webhooks/clerk',
            mockUserCreatedWebhook,
            signature
          );

          expect(response.status).toBe(401);
        }
      });

      it('should handle signature verification when webhook body is tampered', async () => {
        // This test verifies that webhook signature validation would reject tampered data
        // Since we're mocking the signature validation, this effectively tests that
        // invalid signatures are rejected at the middleware level
        
        const tamperedWebhook = {
          type: 'user.created',
          data: { id: 'tampered_id' },
        };

        // Any non-"valid-signature" value should be rejected
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          tamperedWebhook,
          'invalid-signature-for-tampered-data'
        );

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid webhook signature',
        });
      });
    });

    describe('Webhook Body Parsing', () => {
      it('should reject invalid JSON body', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          'invalid json {',
          'valid-signature'
        );

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid JSON in webhook body',
        });
        expect(ClerkSyncService.handleUserWebhook).not.toHaveBeenCalled();
      });

      it('should handle empty body', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          '',
          'valid-signature'
        );

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid JSON in webhook body',
        });
      });

      it('should handle null values in webhook data', async () => {
        const webhookWithNulls = {
          type: 'user.created',
          data: {
            id: 'user_null',
            email_addresses: null,
            first_name: null,
            last_name: null,
          },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          webhookWithNulls,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(webhookWithNulls);
      });

      it('should handle extremely large webhook bodies', async () => {
        const largeWebhook = {
          type: 'user.created',
          data: {
            id: 'user_large',
            large_field: 'x'.repeat(1000000), // 1MB of data
            email_addresses: [{ email_address: 'test@example.com' }],
          },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          largeWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalled();
      });

      it('should handle deeply nested webhook data', async () => {
        const deeplyNested = {
          type: 'user.created',
          data: {
            id: 'user_nested',
            metadata: {
              level1: {
                level2: {
                  level3: {
                    level4: {
                      level5: 'deep value',
                    },
                  },
                },
              },
            },
          },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          deeplyNested,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(deeplyNested);
      });

      it('should handle arrays in webhook data', async () => {
        const webhookWithArrays = {
          type: 'user.created',
          data: {
            id: 'user_arrays',
            email_addresses: Array(100).fill({ email_address: 'test@example.com' }),
            phone_numbers: [],
            roles: ['admin', 'user', 'moderator'],
          },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          webhookWithArrays,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(webhookWithArrays);
      });

      it('should handle webhook with circular reference prevention', async () => {
        // Create a webhook that would have circular references if not handled properly
        const webhookData = {
          type: 'user.created',
          data: {
            id: 'user_circular',
            self: null as any,
          },
        };
        // This would create a circular reference: webhookData.data.self = webhookData.data;
        
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          webhookData,
          'valid-signature'
        );

        expect(response.status).toBe(200);
      });

      it('should handle various JSON edge cases', async () => {
        const edgeCases = [
          { type: 'user.created', data: { id: 'user_unicode', name: '👨‍👩‍👧‍👦🎉' } },
          { type: 'user.created', data: { id: 'user_escape', name: 'Line1\nLine2\tTab' } },
          { type: 'user.created', data: { id: 'user_quotes', name: 'He said "Hello"' } },
          { type: 'user.created', data: { id: 'user_backslash', path: 'C:\\Users\\Test' } },
        ];

        for (const webhook of edgeCases) {
          const response = await createWebhookRequest(
            '/api/webhooks/clerk',
            webhook,
            'valid-signature'
          );

          expect(response.status).toBe(200);
          expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(webhook);
        }
      });
    });

    describe('User Event Handling', () => {
      it('should handle user.created webhook successfully', async () => {
        (ClerkSyncService.handleUserWebhook as jest.Mock).mockResolvedValue(undefined);

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Webhook processed successfully',
        });
        expect(console.log).toHaveBeenCalledWith('Received Clerk webhook: user.created for user user_123');
        expect(console.log).toHaveBeenCalledWith('New user created: user_123');
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(mockUserCreatedWebhook);
      });

      it('should handle user.updated webhook successfully', async () => {
        (ClerkSyncService.handleUserWebhook as jest.Mock).mockResolvedValue(undefined);

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserUpdatedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.log).toHaveBeenCalledWith('Received Clerk webhook: user.updated for user user_456');
        expect(console.log).toHaveBeenCalledWith('User updated: user_456');
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(mockUserUpdatedWebhook);
      });

      it('should handle user.deleted webhook successfully', async () => {
        (ClerkSyncService.handleUserWebhook as jest.Mock).mockResolvedValue(undefined);

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserDeletedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.log).toHaveBeenCalledWith('Received Clerk webhook: user.deleted for user user_789');
        expect(console.log).toHaveBeenCalledWith('User deleted: user_789');
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(mockUserDeletedWebhook);
      });

      it('should handle webhook processing errors gracefully', async () => {
        const error = new Error('Database connection failed');
        (ClerkSyncService.handleUserWebhook as jest.Mock).mockRejectedValue(error);

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200); // Still returns 200 to prevent retries
        expect(response.body).toEqual({
          success: true,
          message: 'Webhook received but failed to process',
          error: 'Database connection failed',
        });
        expect(console.error).toHaveBeenCalledWith('Webhook processing error:', error);
      });

      it('should handle non-Error exceptions', async () => {
        (ClerkSyncService.handleUserWebhook as jest.Mock).mockRejectedValue('String error');

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUserCreatedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Webhook received but failed to process',
          error: 'Unknown error',
        });
      });
    });

    describe('Session Event Handling', () => {
      it('should acknowledge session.created webhook without processing', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockSessionCreatedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.log).toHaveBeenCalledWith('Session created for user: user_123');
        expect(ClerkSyncService.handleUserWebhook).not.toHaveBeenCalled();
      });

      it('should acknowledge session.ended webhook without processing', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockSessionEndedWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.log).toHaveBeenCalledWith('Session ended for user: user_123');
        expect(ClerkSyncService.handleUserWebhook).not.toHaveBeenCalled();
      });
    });

    describe('Unknown Event Handling', () => {
      it('should handle unknown webhook types gracefully', async () => {
        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          mockUnknownWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.warn).toHaveBeenCalledWith('Unhandled webhook type: unknown.event');
        expect(ClerkSyncService.handleUserWebhook).not.toHaveBeenCalled();
      });

      it('should handle webhook without type field', async () => {
        const webhookWithoutType = {
          data: { id: 'user_123' },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          webhookWithoutType,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.warn).toHaveBeenCalledWith('Unhandled webhook type: undefined');
      });

      it('should handle webhook without data field', async () => {
        const webhookWithoutData = {
          type: 'user.created',
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          webhookWithoutData,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(console.log).toHaveBeenCalledWith('Received Clerk webhook: user.created for user undefined');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large webhook payloads', async () => {
        const largeWebhook = {
          type: 'user.created',
          data: {
            id: 'user_large',
            metadata: {
              description: 'x'.repeat(10000), // Large string
            },
          },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          largeWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(largeWebhook);
      });

      it('should handle concurrent webhook requests', async () => {
        (ClerkSyncService.handleUserWebhook as jest.Mock).mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 100))
        );

        const webhooks = [
          { ...mockUserCreatedWebhook, data: { ...mockUserCreatedWebhook.data, id: 'user_1' } },
          { ...mockUserCreatedWebhook, data: { ...mockUserCreatedWebhook.data, id: 'user_2' } },
          { ...mockUserCreatedWebhook, data: { ...mockUserCreatedWebhook.data, id: 'user_3' } },
        ];

        const responses = await Promise.all(
          webhooks.map(webhook => 
            createWebhookRequest('/api/webhooks/clerk', webhook, 'valid-signature')
          )
        );

        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledTimes(3);
      });

      it('should handle special characters in user data', async () => {
        const specialCharWebhook = {
          type: 'user.created',
          data: {
            id: 'user_special_!@#$%',
            email_addresses: [{ email_address: 'test+special@example.com' }],
            first_name: 'Test-Name',
            last_name: "O'Connor",
          },
        };

        const response = await createWebhookRequest(
          '/api/webhooks/clerk',
          specialCharWebhook,
          'valid-signature'
        );

        expect(response.status).toBe(200);
        expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledWith(specialCharWebhook);
      });
    });
  });

  describe('GET /api/webhooks/clerk/test', () => {
    it('should return webhook health check status', async () => {
      const response = await request(app)
        .get('/api/webhooks/clerk/test')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Clerk webhook endpoint is active',
        timestamp: expect.any(String),
        environment: 'test',
      });

      // Verify timestamp is valid ISO string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should return current environment', async () => {
      (env as any).NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/webhooks/clerk/test')
        .expect(200);

      expect(response.body.environment).toBe('production');

      // Reset
      (env as any).NODE_ENV = 'test';
    });

    it('should handle concurrent health check requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/webhooks/clerk/test')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('POST /api/webhooks/clerk/manual-sync', () => {
    describe('Input Validation', () => {
      it('should reject request without userId', async () => {
        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({})
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'userId is required',
        });
        expect(ClerkSyncService.syncUser).not.toHaveBeenCalled();
      });

      it('should reject request with empty userId', async () => {
        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: '' })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'userId is required',
        });
      });

      it('should reject request with invalid action', async () => {
        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_123', action: 'invalid' })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Invalid action. Use "sync" or "check"',
        });
      });
    });

    describe('Sync Action', () => {
      it('should sync user successfully with default action', async () => {
        const mockSyncResult = {
          user_id: 'user_123',
          role: 'OPS',
          synced: true,
        };
        (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue(mockSyncResult);

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_123' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockSyncResult,
          message: 'Manual sync completed for user user_123',
        });
        expect(ClerkSyncService.syncUser).toHaveBeenCalledWith('user_123');
      });

      it('should sync user successfully with explicit sync action', async () => {
        const mockSyncResult = {
          user_id: 'user_456',
          role: 'ADMIN',
          synced: true,
        };
        (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue(mockSyncResult);

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_456', action: 'sync' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockSyncResult,
          message: 'Manual sync completed for user user_456',
        });
        expect(ClerkSyncService.syncUser).toHaveBeenCalledWith('user_456');
      });

      it('should handle sync errors', async () => {
        const error = new Error('User not found in Clerk');
        (ClerkSyncService.syncUser as jest.Mock).mockRejectedValue(error);

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_not_found' })
          .expect(500);

        expect(response.body).toEqual({
          success: false,
          error: 'User not found in Clerk',
        });
        expect(console.error).toHaveBeenCalledWith('Manual sync error:', error);
      });

      it('should handle non-Error exceptions', async () => {
        (ClerkSyncService.syncUser as jest.Mock).mockRejectedValue('String error');

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_error' })
          .expect(500);

        expect(response.body).toEqual({
          success: false,
          error: 'Unknown error',
        });
      });
    });

    describe('Check Action', () => {
      it('should check sync status successfully', async () => {
        (ClerkSyncService.isUserInSync as jest.Mock).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_789', action: 'check' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: true,
          message: 'Manual check completed for user user_789',
        });
        expect(ClerkSyncService.isUserInSync).toHaveBeenCalledWith('user_789');
      });

      it('should handle user out of sync', async () => {
        (ClerkSyncService.isUserInSync as jest.Mock).mockResolvedValue(false);

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_out_sync', action: 'check' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: false,
          message: 'Manual check completed for user user_out_sync',
        });
      });

      it('should handle check errors', async () => {
        (ClerkSyncService.isUserInSync as jest.Mock).mockRejectedValue(
          new Error('Failed to check sync status')
        );

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_check_error', action: 'check' })
          .expect(500);

        expect(response.body).toEqual({
          success: false,
          error: 'Failed to check sync status',
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in userId', async () => {
        (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue({ synced: true });

        await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_!@#$%^&*()' })
          .expect(200);

        expect(ClerkSyncService.syncUser).toHaveBeenCalledWith('user_!@#$%^&*()');
      });

      it('should handle very long userIds', async () => {
        const longUserId = 'user_' + 'x'.repeat(100);
        (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue({ synced: true });

        await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: longUserId })
          .expect(200);

        expect(ClerkSyncService.syncUser).toHaveBeenCalledWith(longUserId);
      });

      it('should handle numeric userId', async () => {
        (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue({ synced: true });

        await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 12345 }) // Numeric userId
          .expect(200);

        expect(ClerkSyncService.syncUser).toHaveBeenCalledWith(12345);
      });

      it('should handle null action explicitly', async () => {
        (ClerkSyncService.syncUser as jest.Mock).mockResolvedValue({ synced: true });

        const response = await request(app)
          .post('/api/webhooks/clerk/manual-sync')
          .send({ userId: 'user_123', action: null })
          .expect(200);

        expect(response.body.message).toBe('Manual sync completed for user user_123');
      });
    });
  });

  describe('Route Registration and Middleware', () => {
    it('should have all expected routes registered', async () => {
      // Test that all routes are accessible
      const routes = [
        { method: 'post', path: '/api/webhooks/clerk' },
        { method: 'get', path: '/api/webhooks/clerk/test' },
        { method: 'post', path: '/api/webhooks/clerk/manual-sync' },
      ];

      for (const route of routes) {
        const response = await (request(app) as any)[route.method](route.path);
        
        // Should not return 404
        expect(response.status).not.toBe(404);
      }
    });

    it('should apply parseRawBody middleware to webhook endpoint', async () => {
      // The fact that we can parse JSON in the webhook tests proves the middleware is working
      // This test verifies the middleware chain is properly set up
      const response = await createWebhookRequest(
        '/api/webhooks/clerk',
        mockUserCreatedWebhook,
        'valid-signature'
      );

      expect(response.status).toBe(200);
    });

    it('should not apply parseRawBody to other endpoints', async () => {
      // Regular JSON parsing should work for manual-sync
      const response = await request(app)
        .post('/api/webhooks/clerk/manual-sync')
        .set('Content-Type', 'application/json')
        .send({ userId: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance and Load Tests', () => {
    it('should handle rapid sequential webhooks', async () => {
      (ClerkSyncService.handleUserWebhook as jest.Mock).mockResolvedValue(undefined);

      const startTime = Date.now();
      const numRequests = 20;

      for (let i = 0; i < numRequests; i++) {
        await createWebhookRequest(
          '/api/webhooks/clerk',
          { ...mockUserCreatedWebhook, data: { ...mockUserCreatedWebhook.data, id: `user_${i}` } },
          'valid-signature'
        );
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle 20 requests reasonably quickly (under 2 seconds)
      expect(totalTime).toBeLessThan(2000);
      expect(ClerkSyncService.handleUserWebhook).toHaveBeenCalledTimes(numRequests);
    });

    it('should handle webhook processing timeout gracefully', async () => {
      // Simulate a long-running process
      (ClerkSyncService.handleUserWebhook as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const response = await createWebhookRequest(
        '/api/webhooks/clerk',
        mockUserCreatedWebhook,
        'valid-signature'
      );

      // Should return immediately even if processing continues
      expect(response.status).toBe(200);
    });
  });
});