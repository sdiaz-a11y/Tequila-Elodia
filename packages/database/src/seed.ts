import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { ACTIONS, RESOURCES, ROLE_KEYS, ROLE_LABELS, grantsForRole } from '@elodia/shared';
import { createPrismaClient } from './client';

loadEnv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

export const DEFAULT_ORG_NAME = 'ELODIA';

export interface SeedOptions {
  /** Overwrite the grants of existing system roles with the defaults. Off by default: administrators edit them (Sprint 1.6). */
  resetRoleGrants?: boolean;
}

/**
 * Idempotent: seeds the organization, the permission catalog and the system roles. Default grants are
 * applied only to roles that do not have any yet, so edits made in the admin screen survive a re-seed.
 * No users and no business data.
 */
export async function seed(
  prisma = createPrismaClient(),
  orgName = DEFAULT_ORG_NAME,
  options: SeedOptions = {},
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const org =
        (await tx.organization.findFirst({ where: { name: orgName } })) ??
        (await tx.organization.create({ data: { name: orgName } }));

      await tx.permission.createMany({
        data: RESOURCES.flatMap((resource) => ACTIONS.map((action) => ({ resource, action }))),
        skipDuplicates: true,
      });
      const permissions = await tx.permission.findMany();
      const permissionId = new Map(permissions.map((p) => [`${p.resource}:${p.action}`, p.id]));

      for (const key of ROLE_KEYS) {
        const role = await tx.role.upsert({
          where: { organizationId_key: { organizationId: org.id, key } },
          update: { name: ROLE_LABELS[key] },
          create: { organizationId: org.id, key, name: ROLE_LABELS[key], isSystem: true },
        });
        const hasGrants = (await tx.rolePermission.count({ where: { roleId: role.id } })) > 0;
        if (hasGrants && !options.resetRoleGrants) continue;
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({
          data: grantsForRole(key).map((g) => ({
            roleId: role.id,
            permissionId: permissionId.get(`${g.resource}:${g.action}`)!,
            scope: g.scope,
          })),
        });
      }
    },
    { timeout: 60_000 },
  );
}

if (require.main === module) {
  const prisma = createPrismaClient();
  seed(prisma, DEFAULT_ORG_NAME, { resetRoleGrants: process.argv.includes('--reset-role-grants') })
    .then(() => console.log('Seed completed'))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
