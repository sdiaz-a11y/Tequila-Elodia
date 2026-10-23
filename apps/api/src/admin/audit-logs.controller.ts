import { Controller, Get, Header, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { auditQuerySchema, type AuditRow, type Paginated } from '@elodia/shared';
import { Requires, type AuthedRequest, type RequestContext } from '../auth/auth.types';
import { ZodValidationPipe } from '../core/validation/zod-validation.pipe';
import { AuditLogsService } from './audit-logs.service';

const contextOf = (req: AuthedRequest): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
const queryPipe = new ZodValidationPipe(auditQuerySchema);

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly logs: AuditLogsService) {}

  @Get()
  @Requires('audit', 'read')
  list(
    @Query(queryPipe) query: ReturnType<typeof auditQuerySchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<Paginated<AuditRow>> {
    return this.logs.list(req.user!, req.scope, query);
  }

  /** Declared before any `:id` route would be, and gated by its own `export` permission. */
  @Get('export.csv')
  @Requires('audit', 'export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="bitacora-elodia.csv"')
  @Header('Cache-Control', 'no-store')
  exportCsv(
    @Query(queryPipe) query: ReturnType<typeof auditQuerySchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<string> {
    return this.logs.exportCsv(req.user!, req.scope, query, contextOf(req));
  }
}
