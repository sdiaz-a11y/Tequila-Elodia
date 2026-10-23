import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@elodia/database';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  organizationId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Anything exposing `auditLog`: the root client or a `$transaction` client. */
export type AuditClient = Pick<PrismaClient, 'auditLog'>;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an audit record. Pass the transaction client so the record commits (or rolls back)
   * together with the change it describes.
   */
  async record(entry: AuditEntry, client: AuditClient = this.prisma.client): Promise<void> {
    await client.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        before: entry.before,
        after: entry.after,
        ip: entry.ip ?? null,
      },
    });
  }
}
