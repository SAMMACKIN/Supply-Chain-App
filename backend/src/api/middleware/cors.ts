import cors from 'cors';
import { env } from '../../config/environment';

// CORS configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins: (string | RegExp)[] = [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
    ];
    
    // Add production domains
    if (env.NODE_ENV === 'production') {
      allowedOrigins.push(
        'https://supply-chain-app.vercel.app',
        /^https:\/\/supply-chain-app-.*\.vercel\.app$/ // Preview deployments
      );
    }
    
    // Check if origin is allowed
    const allowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else {
        return allowed.test(origin);
      }
    });
    
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});