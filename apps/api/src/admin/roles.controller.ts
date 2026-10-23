import { Body, Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { replaceGrantsSchema, type AdminRole, type AdminRoleDetail } from '@elodia/shared';
import { Requires, type AuthedRequest, type RequestContext } from '../auth/auth.types';
import { ZodValidationPipe } from '../core/validation/zod-validation.pipe';
import { RolesService } from './roles.service';

const contextOf = (req: AuthedRequest): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
const idPipe = new ZodValidationPipe(z.uuid());

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @Requires('roles', 'read')
  list(@Req() req: AuthedRequest): Promise<AdminRole[]> {
    return this.roles.list(req.user!, req.scope);
  }

  @Get(':id')
  @Requires('roles', 'read')
  get(@Param('id', idPipe) id: string, @Req() req: AuthedRequest): Promise<AdminRoleDetail> {
    return this.roles.get(req.user!, req.scope, id);
  }

  /** Replaces the whole permission set of a role. Applies to every user of the role on their next request. */
  @Put(':id/permissions')
  @Requires('roles', 'update')
  replaceGrants(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(replaceGrantsSchema))
    body: ReturnType<typeof replaceGrantsSchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<AdminRoleDetail> {
    return this.roles.replaceGrants(req.user!, req.scope, id, body, contextOf(req));
  }

  @Post(':id/reset-defaults')
  @HttpCode(200)
  @Requires('roles', 'update')
  resetDefaults(
    @Param('id', idPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<AdminRoleDetail> {
    return this.roles.resetToDefaults(req.user!, req.scope, id, contextOf(req));
  }
}
