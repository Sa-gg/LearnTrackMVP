/**
 * Prisma 7 Configuration File
 *
 * This file configures the Prisma CLI (migrate, generate, studio).
 * - `datasource.url` provides the connection string for migrations.
 * - The `adapter` option was removed in Prisma 7; no runtime adapter config is needed here.
 *   Driver adapters (pg + @prisma/adapter-pg) are configured in src/lib/prisma.ts for the app runtime.
 *
 * Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
