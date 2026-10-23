/**
 * Creates a user with a system role. Nothing is hard-coded: you choose email, name and role.
 *
 *   NEW_USER_PASSWORD='...' pnpm --filter @elodia/api create-user -- --email a@b.mx --name "Nombre" --role director_vp
 *
 * The password is read from the environment (not argv) so it does not land in shell history or process lists.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createPrismaClient } from '@elodia/database';
import { ROLE_KEYS, loginSchema, passwordSchema, type RoleKey } from '@elodia/shared';
import { PasswordService } from '../auth/password.service';

async function main(): Promise<void> {
  const envFile = path.resolve(__dirname, '../../../../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' },
      org: { type: 'string', default: 'ELODIA' },
    },
  });
  const email = loginSchema.shape.email.parse(values.email);
  const name = values.name?.trim();
  const role = values.role as RoleKey | undefined;
  if (!name) throw new Error('--name is required');
  if (!role || !ROLE_KEYS.includes(role))
    throw new Error(`--role must be one of: ${ROLE_KEYS.join(', ')}`);
  const password = passwordSchema.parse(process.env.NEW_USER_PASSWORD);

  const prisma = createPrismaClient();
  try {
    const org = await prisma.organization.findFirstOrThrow({ where: { name: values.org } });
    const roleRow = await prisma.role.findUniqueOrThrow({
      where: { organizationId_key: { organizationId: org.id, key: role } },
    });
    const passwordHash = await new PasswordService().hash(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: org.id,
          email,
          name,
          passwordHash,
          status: 'active',
          roles: { create: { roleId: roleRow.id } },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          action: 'create',
          resource: 'users',
          resourceId: created.id,
          after: { email, name, role, via: 'cli' },
        },
      });
      return created;
    });
    console.log(`User created: ${user.email} (${role}) in ${org.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
