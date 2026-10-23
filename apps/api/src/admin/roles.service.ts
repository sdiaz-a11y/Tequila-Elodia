import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ROLE_KEYS,
  SCOPES,
  grantsForRole,
  grantsWithin,
  type Action,
  type AdminRole,
  type AdminRoleDetail,
  type GrantLike,
  type ReplaceGrantsInput,
  type Resource,
  type Scope,
  type SessionUser,
} from '@elodia/shared';
import type { RequestContext } from '../auth/auth.types';
import { AuditService } from '../core/audit/audit.service';
import { PrismaService } from '../core/prisma/prisma.service';
import { assertAllScope } from './admin.helpers';

/** The technical owner keeps every permission: editing it could lock everyone out of administration. */
const IMMUTABLE_ROLE = 'tech_superadmin';

const keyOf = (g: Pick<GrantLike, 'resource' | 'action'>) => `${g.resource}:${g.action}`;
const rank = (s: Scope) => SCOPES.indexOf(s);

export interface GrantDiff {
  added: string[];
  removed: string[];
  changed: { permission: string; from: Scope; to: Scope }[];
}

/** Pure diff between two grant sets (keys are `resource:action`). */
export function diffGrants(
  current: readonly GrantLike[],
  desired: readonly GrantLike[],
): GrantDiff {
  const cur = new Map(current.map((g) => [keyOf(g), g.scope]));
  const des = new Map(desired.map((g) => [keyOf(g), g.scope]));
  const diff: GrantDiff = { added: [], removed: [], changed: [] };
  for (const [k, scope] of des) {
    const from = cur.get(k);
    if (from === undefined) diff.added.push(`${k}:${scope}`);
    else if (from !== scope) diff.changed.push({ permission: k, from, to: scope });
  }
  for (const k of cur.keys()) if (!des.has(k)) diff.removed.push(k);
  return diff;
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: SessionUser, scope: Scope | undefined): Promise<AdminRole[]> {
    assertAllScope(scope);
    const roles = await this.prisma.client.role.findMany({
      where: { organizationId: actor.organizationId },
      include: { _count: { select: { users: true, permissions: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const order = new Map<string, number>(ROLE_KEYS.map((k, i) => [k, i]));
    return roles
      .map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        isSystem: r.isSystem,
        userCount: r._count.users,
        grantCount: r._count.permissions,
      }))
      .sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
  }

  async get(actor: SessionUser, scope: Scope | undefined, id: string): Promise<AdminRoleDetail> {
    assertAllScope(scope);
    const role = await this.findRole(actor, id);
    return this.detail(role.id);
  }

  async replaceGrants(
    actor: SessionUser,
    scope: Scope | undefined,
    id: string,
    input: ReplaceGrantsInput,
    ctx: RequestContext,
  ): Promise<AdminRoleDetail> {
    assertAllScope(scope);
    const role = await this.findRole(actor, id);
    return this.applyGrants(actor, role, input.grants, 'update_grants', ctx);
  }

  /** Puts a system role back to the proposed default matrix (still subject to the escalation rule). */
  async resetToDefaults(
    actor: SessionUser,
    scope: Scope | undefined,
    id: string,
    ctx: RequestContext,
  ): Promise<AdminRoleDetail> {
    assertAllScope(scope);
    const role = await this.findRole(actor, id);
    if (!role.isSystem || !(ROLE_KEYS as readonly string[]).includes(role.key))
      throw new BadRequestException('Solo los roles del sistema tienen permisos por defecto');
    return this.applyGrants(actor, role, grantsForRole(role.key as never), 'reset_grants', ctx);
  }

  private async applyGrants(
    actor: SessionUser,
    role: { id: string; key: string },
    desired: readonly GrantLike[],
    action: string,
    ctx: RequestContext,
  ): Promise<AdminRoleDetail> {
    if (role.key === IMMUTABLE_ROLE)
      throw new ForbiddenException('El rol de superadministrador no se puede modificar');

    const current = (await this.detail(role.id)).grants;
    const diff = diffGrants(current, desired);
    if (!diff.added.length && !diff.removed.length && !diff.changed.length)
      return this.detail(role.id);

    // Escalation guard: only new or widened grants must be covered by the actor's own permissions.
    // Removing or narrowing is never an escalation, so it is always allowed.
    const before = new Map(current.map((g) => [keyOf(g), g.scope]));
    const raised = desired.filter((g) => {
      const had = before.get(keyOf(g));
      return had === undefined || rank(g.scope) > rank(had);
    });
    if (!grantsWithin(actor.permissions, raised))
      throw new ForbiddenException('No puedes conceder permisos que tú no tienes');

    const catalog = await this.prisma.client.permission.findMany();
    const permissionId = new Map(catalog.map((p) => [`${p.resource}:${p.action}`, p.id]));

    await this.prisma.client.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({
        data: desired.map((g) => ({
          roleId: role.id,
          permissionId: permissionId.get(keyOf(g))!,
          scope: g.scope,
        })),
      });
      await this.audit.record(
        {
          organizationId: actor.organizationId,
          userId: actor.id,
          action,
          resource: 'roles',
          resourceId: role.id,
          after: { role: role.key, ...diff },
          ip: ctx.ip,
        },
        tx,
      );
    });
    return this.detail(role.id);
  }

  private async detail(roleId: string): Promise<AdminRoleDetail> {
    const role = await this.prisma.client.role.findUniqueOrThrow({
      where: { id: roleId },
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
    });
    const grants = role.permissions
      .map((p) => ({
        resource: p.permission.resource as Resource,
        action: p.permission.action as Action,
        scope: p.scope,
      }))
      .sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
      userCount: role._count.users,
      grantCount: grants.length,
      grants,
    };
  }

  private async findRole(actor: SessionUser, id: string) {
    const role = await this.prisma.client.role.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }
}
