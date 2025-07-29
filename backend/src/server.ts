import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import 'express-async-errors';

// Load environment variables
dotenv.config();

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
const PORT = process.env.PORT || 3001;

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
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/quotas', quotaRoutes);
app.use('/api/call-offs', callOffRoutes);
app.use('/api/shipment-lines', shipmentLineRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔄 Deployment: ${new Date().toISOString()}`);
});