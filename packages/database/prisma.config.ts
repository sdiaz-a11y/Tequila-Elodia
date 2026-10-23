import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load the repo-root .env (never committed).
loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: { path: path.join(__dirname, 'prisma', 'migrations') },
  datasource: {
    // Migrations use the direct/session connection; runtime uses DATABASE_URL (see src/client.ts).
    url: process.env.DIRECT_URL ?? '',
  },
});
