import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ChangePasswordInput, LoginInput, SessionUser } from '@elodia/shared';
import { AuditService } from '../core/audit/audit.service';
import { APP_ENV, type AppEnv } from '../core/config/env';
import { PrismaService } from '../core/prisma/prisma.service';
import type { RequestContext } from './auth.types';
import { PasswordService } from './password.service';
import { decryptSecret, encryptSecret } from './secret-box';
import { hashToken, SessionsService } from './sessions.service';
import { generateTotpSecret, otpauthUri, verifyTotp } from './totp';

const MAX_FAILED_ATTEMPTS = 5;
const MAX_LOCK_MINUTES = 60;
const ISSUER = 'ELODIA OS';

const invalidCredentials = () => new UnauthorizedException('Credenciales inválidas');

/** Progressive lock: 1, 2, 4 … minutes after the 5th consecutive failure, capped at one hour. */
export function lockMinutes(failedCount: number): number {
  if (failedCount < MAX_FAILED_ATTEMPTS) return 0;
  return Math.min(2 ** (failedCount - MAX_FAILED_ATTEMPTS), MAX_LOCK_MINUTES);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async login(
    input: LoginInput,
    ctx: RequestContext,
  ): Promise<{ token: string; expiresAt: Date; user: SessionUser }> {
    const candidates = await this.prisma.client.user.findMany({
      where: {
        email: input.email,
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      },
      take: 2,
    });
    // Ambiguous (same email in several organizations) is treated like "not found" to avoid leaking membership.
    const user = candidates.length === 1 ? candidates[0]! : null;

    if (!user?.passwordHash || user.status !== 'active') {
      await this.passwords.verifyDummy(input.password);
      throw invalidCredentials();
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      await this.passwords.verifyDummy(input.password);
      await this.audit.record({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login_blocked',
        resource: 'auth',
        ip: ctx.ip,
      });
      throw invalidCredentials();
    }

    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      await this.registerFailure(
        user.id,
        user.organizationId,
        user.failedLoginCount + 1,
        ctx,
        'bad_password',
      );
      throw invalidCredentials();
    }

    if (user.totpEnabledAt) {
      if (!input.totpCode) {
        throw new UnauthorizedException({
          message: 'Se requiere el código de verificación',
          code: 'totp_required',
        });
      }
      const secret = decryptSecret(user.totpSecretEnc!, this.requireKey());
      if (!verifyTotp(secret, input.totpCode)) {
        await this.registerFailure(
          user.id,
          user.organizationId,
          user.failedLoginCount + 1,
          ctx,
          'bad_totp',
        );
        throw new UnauthorizedException({
          message: 'Código de verificación inválido',
          code: 'totp_invalid',
        });
      }
    }

    const session = await this.sessions.create(user.id, ctx);
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'login',
      resource: 'auth',
      ip: ctx.ip,
    });
    const sessionUser = (await this.sessions.loadSessionUser(user.id))!;
    return { ...session, user: sessionUser };
  }

  async logout(token: string, user: SessionUser, ctx: RequestContext): Promise<void> {
    await this.sessions.revokeByToken(token);
    await this.audit.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'logout',
      resource: 'auth',
      ip: ctx.ip,
    });
  }

  async logoutAll(user: SessionUser, ctx: RequestContext): Promise<number> {
    const count = await this.sessions.revokeAllForUser(user.id);
    await this.audit.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'logout_all',
      resource: 'auth',
      after: { revoked: count },
      ip: ctx.ip,
    });
    return count;
  }

  /**
   * The current password is re-checked (a stolen session alone cannot take over the account) and wrong
   * attempts feed the same progressive lock as login. The new one must differ. Other sessions end.
   */
  async changePassword(
    user: SessionUser,
    input: ChangePasswordInput,
    ctx: RequestContext,
    currentSessionToken: string,
  ): Promise<void> {
    const row = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } });
    const now = new Date();
    if (row.lockedUntil && row.lockedUntil > now)
      throw new BadRequestException('Demasiados intentos. Inténtalo más tarde.');
    if (
      !row.passwordHash ||
      !(await this.passwords.verify(row.passwordHash, input.currentPassword))
    ) {
      await this.registerFailure(
        row.id,
        row.organizationId,
        row.failedLoginCount + 1,
        ctx,
        'bad_current_password',
      );
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (input.newPassword === input.currentPassword)
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual');

    await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await this.passwords.hash(input.newPassword),
          mustChangePassword: false,
          passwordChangedAt: now,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await this.audit.record(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'change_password',
          resource: 'auth',
          resourceId: user.id,
          ip: ctx.ip,
        },
        tx,
      );
    });
    await this.revokeOtherSessions(user.id, currentSessionToken);
  }

  /** Step 1 of 2FA: creates a pending secret (stored encrypted, not active until confirmed). */
  async totpSetup(user: SessionUser): Promise<{ secret: string; otpauthUri: string }> {
    if (user.totpEnabled)
      throw new BadRequestException('La verificación en dos pasos ya está activa.');
    const secret = generateTotpSecret();
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { totpSecretEnc: encryptSecret(secret, this.requireKey()) },
    });
    return { secret, otpauthUri: otpauthUri(ISSUER, user.email, secret) };
  }

  /** Step 2: the user proves they can generate codes. Other sessions are revoked. */
  async totpEnable(
    user: SessionUser,
    code: string,
    ctx: RequestContext,
    currentSessionToken: string,
  ): Promise<void> {
    const row = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } });
    if (row.totpEnabledAt || !row.totpSecretEnc)
      throw new BadRequestException('Inicia la configuración de nuevo.');
    if (!verifyTotp(decryptSecret(row.totpSecretEnc, this.requireKey()), code)) {
      throw new BadRequestException('Código de verificación inválido');
    }
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date() },
    });
    await this.revokeOtherSessions(user.id, currentSessionToken);
    await this.audit.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'totp_enabled',
      resource: 'auth',
      ip: ctx.ip,
    });
  }

  async totpDisable(
    user: SessionUser,
    password: string,
    code: string,
    ctx: RequestContext,
  ): Promise<void> {
    const row = await this.prisma.client.user.findUniqueOrThrow({ where: { id: user.id } });
    const passwordOk = row.passwordHash
      ? await this.passwords.verify(row.passwordHash, password)
      : false;
    const codeOk = row.totpSecretEnc
      ? verifyTotp(decryptSecret(row.totpSecretEnc, this.requireKey()), code)
      : false;
    if (!row.totpEnabledAt || !passwordOk || !codeOk)
      throw new BadRequestException('No se pudo desactivar la verificación.');
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { totpSecretEnc: null, totpEnabledAt: null },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'totp_disabled',
      resource: 'auth',
      ip: ctx.ip,
    });
  }

  private async revokeOtherSessions(userId: string, keepToken: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: { userId, revokedAt: null, NOT: { tokenHash: hashToken(keepToken) } },
      data: { revokedAt: new Date() },
    });
  }

  private async registerFailure(
    userId: string,
    organizationId: string,
    failedCount: number,
    ctx: RequestContext,
    reason: string,
  ) {
    const minutes = lockMinutes(failedCount);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: failedCount,
        lockedUntil: minutes ? new Date(Date.now() + minutes * 60_000) : null,
      },
    });
    await this.audit.record({
      organizationId,
      userId,
      action: 'login_failed',
      resource: 'auth',
      after: { reason, failedCount, lockedMinutes: minutes },
      ip: ctx.ip,
    });
  }

  private requireKey(): string {
    if (!this.env.APP_ENCRYPTION_KEY)
      throw new Error('APP_ENCRYPTION_KEY is required for two-factor authentication');
    return this.env.APP_ENCRYPTION_KEY;
  }
}
