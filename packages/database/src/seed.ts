import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { ACTIONS, RESOURCES, ROLE_KEYS, grantsForRole, type RoleKey } from '@elodia/shared';
import { createPrismaClient } from './client';

loadEnv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const ROLE_NAMES: Record<RoleKey, string> = {
  tech_superadmin: 'Superadministrador técnico',
  director_vp: 'Dirección general',
  ops_admin: 'Administración operativa',
  sales_manager: 'Gerente comercial',
  salesperson: 'Vendedor',
  marketing: 'Marketing',
  operations: 'Operaciones',
  finance: 'Finanzas',
  collaborator: 'Colaborador',
  external_distributor: 'Distribuidor externo',
};

export const DEFAULT_ORG_NAME = 'ELODIA';

/** Idempotent: seeds the organization, the permission catalog, system roles and their grants. No users and no business data. */
export async function seed(
  prisma = createPrismaClient(),
  orgName = DEFAULT_ORG_NAME,
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
          update: { name: ROLE_NAMES[key] },
          create: { organizationId: org.id, key, name: ROLE_NAMES[key], isSystem: true },
        });
        // The default matrix is the source of truth for system roles: re-seeding resets it.
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
  seed(prisma)
    .then(() => console.log('Seed completed'))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
