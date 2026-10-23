/**
 * Sets a new password for an existing user (until the admin UI exists, Sprint 1.6).
 *
 *   NEW_USER_PASSWORD='...' pnpm --filter @elodia/api reset-password -- --email a@b.mx [--org ELODIA]
 *
 * The password is read from the environment (not argv) so it does not land in shell history or process lists.
 * It must meet the policy (12+ characters). All of the user's sessions are revoked and the failed-login lock is cleared.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createPrismaClient } from '@elodia/database';
import { loginSchema, passwordSchema } from '@elodia/shared';
import { PasswordService } from '../auth/password.service';

async function main(): Promise<void> {
  const envFile = path.resolve(__dirname, '../../../../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const { values } = parseArgs({
    options: { email: { type: 'string' }, org: { type: 'string', default: 'ELODIA' } },
  });
  const email = loginSchema.shape.email.parse(values.email);
  const password = passwordSchema.parse(process.env.NEW_USER_PASSWORD);

  const prisma = createPrismaClient();
  try {
    const org = await prisma.organization.findFirstOrThrow({ where: { name: values.org } });
    const user = await prisma.user.findUniqueOrThrow({
      where: { organizationId_email: { organizationId: org.id, email } },
    });
    const passwordHash = await new PasswordService().hash(password);

    const revoked = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      const sessions = await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          action: 'password_reset',
          resource: 'users',
          resourceId: user.id,
          after: { via: 'cli', sessionsRevoked: sessions.count },
        },
      });
      return sessions.count;
    });
    console.log(`Password updated for ${email} in ${org.name} (${revoked} session(s) revoked)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
