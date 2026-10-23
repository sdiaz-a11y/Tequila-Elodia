import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { afterAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '@elodia/database';
import { AuditService } from './audit.service';
import type { PrismaService } from '../prisma/prisma.service';

loadEnv({ path: path.resolve(__dirname, '../../../../../.env'), quiet: true });

// Real Supabase database; skipped without a connection (e.g. CI). audit_logs is append-only,
// so every write happens inside a transaction that is rolled back — no rows are left behind.
const hasDb = Boolean(process.env.DATABASE_URL);

class Rollback extends Error {}

describe.skipIf(!hasDb)('AuditService (Supabase)', () => {
  const client = hasDb ? createPrismaClient() : (undefined as never);
  const audit = new AuditService({ client } as unknown as PrismaService);

  afterAll(async () => {
    await client?.$disconnect();
  });

  it('records an entry with before/after in the caller transaction', async () => {
    const org = await client.organization.findFirstOrThrow({ where: { name: 'ELODIA' } });
    let found: Awaited<ReturnType<typeof client.auditLog.findFirst>> = null;

    await expect(
      client.$transaction(async (tx) => {
        await audit.record(
          {
            organizationId: org.id,
            action: 'update',
            resource: 'accounts',
            resourceId: 'abc',
            before: { name: 'Antes' },
            after: { name: 'Después' },
            ip: '127.0.0.1',
          },
          tx,
        );
        found = await tx.auditLog.findFirst({
          where: { organizationId: org.id, resource: 'accounts', resourceId: 'abc' },
        });
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);

    expect(found).toMatchObject({
      action: 'update',
      before: { name: 'Antes' },
      after: { name: 'Después' },
      userId: null,
    });
    expect(await client.auditLog.count({ where: { resourceId: 'abc' } })).toBe(0);
  });
});
