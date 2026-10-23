import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { permissionKey, widerScope, type Scope, type SessionUser } from '@elodia/shared';
import { APP_ENV, type AppEnv } from '../core/config/env';
import { PrismaService } from '../core/prisma/prisma.service';
import type { RequestContext } from './auth.types';

const TOUCH_INTERVAL_MS = 60_000;

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  /** Opaque 256-bit token; only its SHA-256 is stored, so a database leak does not yield usable sessions. */
  async create(userId: string, ctx: RequestContext): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.env.SESSION_TTL_HOURS * 3_600_000);
    await this.prisma.client.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent?.slice(0, 255) ?? null,
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  /** Returns the user bound to a live session (not revoked, not expired, not idle), or null. */
  async authenticate(token: string): Promise<{ sessionId: string; user: SessionUser } | null> {
    const session = await this.prisma.client.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, status: true } } },
    });
    if (!session || session.revokedAt || session.user.status !== 'active') return null;
    const now = Date.now();
    if (session.expiresAt.getTime() <= now) return null;
    if (now - session.lastSeenAt.getTime() > this.env.SESSION_IDLE_MINUTES * 60_000) return null;

    if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.client.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now) },
      });
    }
    const user = await this.loadSessionUser(session.userId);
    return user ? { sessionId: session.id, user } : null;
  }

  async revokeByToken(token: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const res = await this.prisma.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.count;
  }

  /** Roles and the widest scope per `resource:action`. Permissions are re-read on every request, so changes apply at once. */
  async loadSessionUser(userId: string): Promise<SessionUser | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user) return null;
    const permissions: Record<string, Scope> = {};
    for (const { role } of user.roles) {
      for (const rp of role.permissions) {
        const key = permissionKey(rp.permission.resource as never, rp.permission.action as never);
        const current = permissions[key];
        permissions[key] = current ? widerScope(current, rp.scope) : rp.scope;
      }
    }
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      roles: user.roles.map((r) => r.role.key),
      totpEnabled: user.totpEnabledAt !== null,
      permissions,
    };
  }
}
