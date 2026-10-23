import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

/**
 * Runtime client. Uses DATABASE_URL (Supabase transaction pooler, port 6543).
 * Migrations use DIRECT_URL via prisma.config.ts.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
