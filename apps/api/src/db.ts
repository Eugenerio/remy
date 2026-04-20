import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
        : [{ level: 'error', emit: 'stdout' }],
  });

if (env.NODE_ENV !== 'production') {
  prismaGlobal.prisma = prisma;
}
