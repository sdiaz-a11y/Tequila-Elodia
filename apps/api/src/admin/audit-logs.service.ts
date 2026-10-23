import { Injectable } from '@nestjs/common';
import type { Prisma } from '@elodia/database';
import {
  pageToSkipTake,
  paginated,
  type AuditQuery,
  type AuditRow,
  type Paginated,
  type Scope,
  type SessionUser,
} from '@elodia/shared';
import type { RequestContext } from '../auth/auth.types';
import { AuditService } from '../core/audit/audit.service';
import { PrismaService } from '../core/prisma/prisma.service';
import { assertAllScope, csvRow } from './admin.helpers';

/** UTF-8 byte order mark, so Excel opens accents correctly. */
const BOM = String.fromCharCode(0xfeff);

/** Hard cap per export: a CSV is a review aid, not a data dump. Narrow the filters to get the rest. */
export const EXPORT_LIMIT = 10_000;

const include = {
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AuditLogInclude;
type Row = Prisma.AuditLogGetPayload<{ include: typeof include }>;

const toRow = (r: Row): AuditRow => ({
  id: r.id,
  createdAt: r.createdAt.toISOString(),
  action: r.action,
  resource: r.resource,
  resourceId: r.resourceId,
  user: r.user,
  ip: r.ip,
  before: r.before,
  after: r.after,
});

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    actor: SessionUser,
    scope: Scope | undefined,
    q: AuditQuery,
  ): Promise<Paginated<AuditRow>> {
    assertAllScope(scope);
    const where = this.where(actor, q);
    const [rows, total] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...pageToSkipTake(q),
      }),
      this.prisma.client.auditLog.count({ where }),
    ]);
    return paginated(rows.map(toRow), total, q);
  }

  /** The export is itself audited (who exported what, how many rows). */
  async exportCsv(
    actor: SessionUser,
    scope: Scope | undefined,
    q: AuditQuery,
    ctx: RequestContext,
  ): Promise<string> {
    assertAllScope(scope);
    const rows = await this.prisma.client.auditLog.findMany({
      where: this.where(actor, q),
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: EXPORT_LIMIT,
    });
    await this.audit.record({
      organizationId: actor.organizationId,
      userId: actor.id,
      action: 'export',
      resource: 'audit',
      after: {
        rows: rows.length,
        truncated: rows.length === EXPORT_LIMIT,
        filters: {
          from: q.from?.toISOString() ?? null,
          to: q.to?.toISOString() ?? null,
          action: q.action ?? null,
          resource: q.resource ?? null,
          userId: q.userId ?? null,
          q: q.q ?? null,
        },
      },
      ip: ctx.ip,
    });
    const lines = [
      csvRow([
        'fecha',
        'usuario',
        'correo',
        'accion',
        'recurso',
        'id_recurso',
        'ip',
        'antes',
        'despues',
      ]),
      ...rows.map((r) =>
        csvRow([
          r.createdAt.toISOString(),
          r.user?.name,
          r.user?.email,
          r.action,
          r.resource,
          r.resourceId,
          r.ip,
          r.before === null ? '' : JSON.stringify(r.before),
          r.after === null ? '' : JSON.stringify(r.after),
        ]),
      ),
    ];
    return `${BOM}${lines.join('\r\n')}\r\n`;
  }

  private where(actor: SessionUser, q: AuditQuery): Prisma.AuditLogWhereInput {
    return {
      organizationId: actor.organizationId,
      ...(q.from || q.to
        ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
        : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.resource ? { resource: q.resource } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.q
        ? {
            OR: [
              { action: { contains: q.q, mode: 'insensitive' } },
              { resource: { contains: q.q, mode: 'insensitive' } },
              { resourceId: { contains: q.q, mode: 'insensitive' } },
              { user: { is: { email: { contains: q.q, mode: 'insensitive' } } } },
              { user: { is: { name: { contains: q.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
  }
}
