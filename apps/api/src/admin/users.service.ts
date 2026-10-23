import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@elodia/database';
import {
  ELEVATED_ROLE_KEYS,
  grantsWithin,
  pageToSkipTake,
  paginated,
  type Action,
  type AdminUser,
  type CreateUserInput,
  type GrantLike,
  type ListUsersQuery,
  type Paginated,
  type Resource,
  type Scope,
  type SessionUser,
  type TemporaryPasswordResult,
  type UpdateUserInput,
  type UserStatus,
} from '@elodia/shared';
import type { RequestContext } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../core/audit/audit.service';
import { PrismaService } from '../core/prisma/prisma.service';
import { assertAllScope, generateTemporaryPassword } from './admin.helpers';

const userInclude = {
  roles: { include: { role: { select: { id: true, key: true, name: true, isSystem: true } } } },
} satisfies Prisma.UserInclude;
type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

const SUPERADMIN = 'tech_superadmin';

interface RoleLite {
  id: string;
  key: string;
  isSystem: boolean;
}

export const toAdminUser = (u: UserRow): AdminUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  status: u.status as UserStatus,
  roles: u.roles.map(({ role }) => ({ id: role.id, key: role.key, name: role.name })),
  lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  lockedUntil: u.lockedUntil && u.lockedUntil > new Date() ? u.lockedUntil.toISOString() : null,
  mustChangePassword: u.mustChangePassword,
  createdAt: u.createdAt.toISOString(),
});

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async list(
    actor: SessionUser,
    scope: Scope | undefined,
    q: ListUsersQuery,
  ): Promise<Paginated<AdminUser>> {
    const where: Prisma.UserWhereInput = {
      organizationId: actor.organizationId,
      // Anything narrower than "all" only sees the own account.
      ...(scope === 'all' ? {} : { id: actor.id }),
      ...(q.status ? { status: q.status } : {}),
      ...(q.roleId ? { roles: { some: { roleId: q.roleId } } } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        include: userInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...pageToSkipTake(q),
      }),
      this.prisma.client.user.count({ where }),
    ]);
    return paginated(rows.map(toAdminUser), total, q);
  }

  async create(
    actor: SessionUser,
    scope: Scope | undefined,
    input: CreateUserInput,
    ctx: RequestContext,
  ): Promise<TemporaryPasswordResult> {
    assertAllScope(scope);
    const role = await this.findRole(actor, input.roleId);
    await this.assertCanAssign(actor, [role]);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.passwords.hash(temporaryPassword);
    try {
      const created = await this.prisma.client.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            organizationId: actor.organizationId,
            email: input.email,
            name: input.name,
            passwordHash,
            status: 'active',
            mustChangePassword: true,
            roles: { create: { roleId: role.id } },
          },
          include: userInclude,
        });
        await this.audit.record(
          {
            organizationId: actor.organizationId,
            userId: actor.id,
            action: 'create',
            resource: 'users',
            resourceId: user.id,
            after: { email: user.email, name: user.name, role: role.key },
            ip: ctx.ip,
          },
          tx,
        );
        return user;
      });
      return { user: toAdminUser(created), temporaryPassword };
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002')
        throw new ConflictException('Ya existe un usuario con ese correo');
      throw e;
    }
  }

  async update(
    actor: SessionUser,
    scope: Scope | undefined,
    id: string,
    input: UpdateUserInput,
    ctx: RequestContext,
  ): Promise<AdminUser> {
    assertAllScope(scope);
    const target = await this.findTarget(actor, id);
    if (id === actor.id && (input.status !== undefined || input.roleId !== undefined))
      throw new ForbiddenException('No puedes cambiar tu propio rol ni tu estado');
    await this.assertCanManage(actor, target);

    const isSuperadmin = target.roles.some((r) => r.role.key === SUPERADMIN);
    const newRole = input.roleId ? await this.findRole(actor, input.roleId) : null;
    if (newRole) await this.assertCanAssign(actor, [newRole]);
    const losesSuperadmin =
      isSuperadmin && (input.status === 'disabled' || (newRole && newRole.key !== SUPERADMIN));
    if (losesSuperadmin) await this.assertAnotherSuperadmin(actor.organizationId, target.id);

    const before = { name: target.name, status: target.status, role: target.roles[0]?.role.key };
    const updated = await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      if (newRole) {
        await tx.userRole.deleteMany({ where: { userId: target.id } });
        await tx.userRole.create({ data: { userId: target.id, roleId: newRole.id } });
      }
      if (input.status === 'disabled') {
        await tx.session.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.audit.record(
        {
          organizationId: actor.organizationId,
          userId: actor.id,
          action:
            input.status === 'disabled'
              ? 'disable'
              : input.status === 'active'
                ? 'enable'
                : 'update',
          resource: 'users',
          resourceId: target.id,
          before,
          after: {
            name: input.name ?? before.name,
            status: input.status ?? before.status,
            role: newRole?.key ?? before.role,
          },
          ip: ctx.ip,
        },
        tx,
      );
      return tx.user.findUniqueOrThrow({ where: { id: target.id }, include: userInclude });
    });
    return toAdminUser(updated);
  }

  /** Issues a new temporary password, unlocks the account and ends every session of the target. */
  async resetPassword(
    actor: SessionUser,
    scope: Scope | undefined,
    id: string,
    ctx: RequestContext,
  ): Promise<TemporaryPasswordResult> {
    assertAllScope(scope);
    if (id === actor.id)
      throw new ForbiddenException('Para tu propia cuenta usa "Cambiar contraseña"');
    const target = await this.findTarget(actor, id);
    await this.assertCanManage(actor, target);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await this.passwords.hash(temporaryPassword);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: {
          passwordHash,
          mustChangePassword: true,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          organizationId: actor.organizationId,
          userId: actor.id,
          action: 'reset_password',
          resource: 'users',
          resourceId: target.id,
          ip: ctx.ip,
        },
        tx,
      );
      return tx.user.findUniqueOrThrow({ where: { id: target.id }, include: userInclude });
    });
    return { user: toAdminUser(updated), temporaryPassword };
  }

  async unlock(
    actor: SessionUser,
    scope: Scope | undefined,
    id: string,
    ctx: RequestContext,
  ): Promise<AdminUser> {
    assertAllScope(scope);
    const target = await this.findTarget(actor, id);
    await this.assertCanManage(actor, target);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
      await this.audit.record(
        {
          organizationId: actor.organizationId,
          userId: actor.id,
          action: 'unlock',
          resource: 'users',
          resourceId: target.id,
          ip: ctx.ip,
        },
        tx,
      );
      return tx.user.findUniqueOrThrow({ where: { id: target.id }, include: userInclude });
    });
    return toAdminUser(updated);
  }

  /** Same organization or "not found": ids from other tenants are indistinguishable from missing ones. */
  private async findTarget(actor: SessionUser, id: string): Promise<UserRow> {
    const user = await this.prisma.client.user.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: userInclude,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async findRole(actor: SessionUser, roleId: string) {
    const role = await this.prisma.client.role.findFirst({
      where: { id: roleId, organizationId: actor.organizationId },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  private async grantsOf(roleIds: string[]): Promise<GrantLike[]> {
    const rows = await this.prisma.client.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });
    return rows.map((r) => ({
      resource: r.permission.resource as Resource,
      action: r.permission.action as Action,
      scope: r.scope,
    }));
  }

  /**
   * Privilege escalation guard. Elevated roles (superadmin, direction) and custom roles can only be handed
   * out by someone who already holds every permission they carry; the other system roles are an ordinary
   * part of onboarding for anyone allowed to create users.
   */
  private async assertCanAssign(actor: SessionUser, roles: RoleLite[]): Promise<void> {
    const strict = roles.filter(
      (r) => !r.isSystem || (ELEVATED_ROLE_KEYS as readonly string[]).includes(r.key),
    );
    if (!strict.length) return;
    if (!grantsWithin(actor.permissions, await this.grantsOf(strict.map((r) => r.id))))
      throw new ForbiddenException('No puedes asignar un rol con más permisos que los tuyos');
  }

  /** …and the same limit applies to managing people who hold such roles. */
  private async assertCanManage(actor: SessionUser, target: UserRow): Promise<void> {
    const roles = target.roles.map((r) => r.role);
    try {
      await this.assertCanAssign(actor, roles);
    } catch {
      throw new ForbiddenException('No puedes administrar a un usuario con más permisos que tú');
    }
  }

  private async assertAnotherSuperadmin(
    organizationId: string,
    excludeUserId: string,
  ): Promise<void> {
    const others = await this.prisma.client.user.count({
      where: {
        organizationId,
        id: { not: excludeUserId },
        status: 'active',
        roles: { some: { role: { key: SUPERADMIN } } },
      },
    });
    if (others === 0)
      throw new ConflictException('Debe quedar al menos un superadministrador activo');
  }
}
