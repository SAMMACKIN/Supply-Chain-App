import { z } from 'zod';

// Define environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Authentication (optional during mock auth phase)
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  
  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // API
  API_SECRET_KEY: z.string().optional(),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error('Must be a valid number');
    return num;
  }).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error('Must be a valid number');
    return num;
  }).default('100'),
});

// Parse and validate environment variables
const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data;
};

export const env = parseEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;