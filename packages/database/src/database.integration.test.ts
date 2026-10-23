import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACTIONS, RESOURCES, ROLE_KEYS, grantsForRole } from '@elodia/shared';
import { createPrismaClient } from './client';
import { seed } from './seed';

loadEnv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

// Runs against the real Supabase database; skipped when no connection is configured (e.g. CI).
const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);

describe.skipIf(!hasDb)('database (Supabase)', () => {
  const prisma = hasDb ? createPrismaClient() : (undefined as never);

  beforeAll(async () => {
    await seed(prisma);
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('seeds the permission catalog and system roles', async () => {
    expect(await prisma.permission.count()).toBe(RESOURCES.length * ACTIONS.length);
    const org = await prisma.organization.findFirstOrThrow({ where: { name: 'ELODIA' } });
    const roles = await prisma.role.findMany({
      where: { organizationId: org.id },
      include: { _count: { select: { permissions: true } } },
    });
    expect(roles.map((r) => r.key).sort()).toEqual([...ROLE_KEYS].sort());
    for (const r of roles) expect(r._count.permissions).toBe(grantsForRole(r.key as never).length);
  });

  it('is idempotent', async () => {
    const before = await prisma.rolePermission.count();
    await seed(prisma);
    expect(await prisma.rolePermission.count()).toBe(before);
    expect(await prisma.organization.count({ where: { name: 'ELODIA' } })).toBe(1);
  });

  it('keeps audit_logs append-only and RLS enabled (rolled back, leaves no rows)', async () => {
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    try {
      const rls = await client.query(
        "select count(*)::int as n from pg_tables where schemaname='public' and tablename <> '_prisma_migrations' and not rowsecurity",
      );
      expect(rls.rows[0].n).toBe(0);

      await client.query('begin');
      const org = await client.query("select id from organizations where name='ELODIA'");
      const ins = await client.query(
        "insert into audit_logs (id, organization_id, action, resource) values (gen_random_uuid(), $1, 'test', 'test') returning id",
        [org.rows[0].id],
      );
      await client.query('savepoint s1');
      await expect(
        client.query('update audit_logs set action=$1 where id=$2', ['x', ins.rows[0].id]),
      ).rejects.toThrow(/append-only/);
      await client.query('rollback to savepoint s1');
      await expect(
        client.query('delete from audit_logs where id=$1', [ins.rows[0].id]),
      ).rejects.toThrow(/append-only/);
    } finally {
      await client.query('rollback').catch(() => undefined);
      await client.end();
    }
  });
});
