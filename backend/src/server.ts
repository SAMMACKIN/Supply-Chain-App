import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import 'express-async-errors';

// Load environment variables
dotenv.config();

// Import database
import { prisma } from './db/client';

// Import middleware
import { errorHandler } from './api/middleware/error';
import { rateLimiter } from './api/middleware/rate-limit';
import { corsMiddleware } from './api/middleware/cors';

// Import routes
import quotaRoutes from './api/routes/quotas';
import callOffRoutes from './api/routes/calloffs';
import shipmentLineRoutes from './api/routes/shipment-lines';
import authRoutes from './api/routes/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0'; // Bind to all network interfaces

// Log startup
console.log('🔧 Starting server initialization...');
console.log(`🔧 PORT from environment: ${process.env.PORT}`);
console.log(`🔧 DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'connected'
  });
});

// Mock API endpoint for testing without database
app.get('/api/quotas/mock', (_req, res) => {
  res.json({
    success: true,
    data: [
      {
        quota_id: 'mock-1',
        counterparty_id: 'mock-cp-1',
        direction: 'BUY',
        period_month: '2025-01',
        bundle_qty: 100,
        metal_code: 'CU',
        counterparty: {
          company_name: 'Mock Supplier',
          company_code: 'MS001'
        },
        used_qty: 20,
        available_qty: 80
      }
    ],
    count: 1
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/quotas', quotaRoutes);
app.use('/api/call-offs', callOffRoutes);
app.use('/api/shipment-lines', shipmentLineRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server with error handling
const server = app.listen(PORT, HOST, async () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔄 Deployment: ${new Date().toISOString()}`);
  
  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
});

// Handle server errors
server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});