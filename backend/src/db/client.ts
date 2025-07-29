import { PrismaClient } from '@prisma/client';
import { env } from '../config/environment';

// Prevent multiple instances during development
const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

// Only create Prisma client if DATABASE_URL exists
export const prisma = env.DATABASE_URL
  ? (globalForPrisma.prisma ||
    new PrismaClient({
      log: env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    }))
  : null;

if (env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});