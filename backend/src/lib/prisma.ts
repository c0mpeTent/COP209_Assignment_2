import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Only connect to database when not in test mode
if (process.env.NODE_ENV !== 'test') {
  prisma.$connect().then(() => {
    console.log('db connected');
  }).catch((error) => {
    console.error('Failed to connect to database:', error);
  });
}

export default prisma;