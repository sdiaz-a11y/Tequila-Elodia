import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@elodia/shared';
import type { PrismaService } from '../core/prisma/prisma.service';
import { HealthController } from './health.controller';

const prisma = {
  client: { $queryRaw: async () => [{ '?column?': 1 }] },
} as unknown as PrismaService;

describe('HealthController', () => {
  it('returns a valid health payload', () => {
    const res = new HealthController(prisma).check();
    expect(healthResponseSchema.safeParse(res).success).toBe(true);
    expect(res.status).toBe('ok');
  });
});
