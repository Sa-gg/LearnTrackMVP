/**
 * Prisma 7 — driver-adapter instantiation (pg).
 * Docs: https://www.prisma.io/docs/orm/overview/databases/database-drivers
 *
 * We use `pg` Pool + `@prisma/adapter-pg` instead of the legacy
 * PrismaClient({ datasources }) pattern from Prisma 6 and below.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('[prisma] DATABASE_URL is not set in environment variables.');
}

// Re-use the pool across hot-reloads in development
const globalForPrisma = globalThis as unknown as {
  pool: Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pool: Pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const adapter = new PrismaPg(pool);

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
