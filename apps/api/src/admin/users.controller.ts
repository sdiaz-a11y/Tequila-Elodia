import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  type AdminUser,
  type Paginated,
  type TemporaryPasswordResult,
} from '@elodia/shared';
import { Requires, type AuthedRequest, type RequestContext } from '../auth/auth.types';
import { ZodValidationPipe } from '../core/validation/zod-validation.pipe';
import { UsersService } from './users.service';

const contextOf = (req: AuthedRequest): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
const idPipe = new ZodValidationPipe(z.uuid());

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Requires('users', 'read')
  list(
    @Query(new ZodValidationPipe(listUsersQuerySchema))
    query: ReturnType<typeof listUsersQuerySchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<Paginated<AdminUser>> {
    return this.users.list(req.user!, req.scope, query);
  }

  /** The temporary password is in the response only; it is not stored or logged in clear. */
  @Post()
  @Requires('users', 'create')
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: ReturnType<typeof createUserSchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<TemporaryPasswordResult> {
    return this.users.create(req.user!, req.scope, body, contextOf(req));
  }

  @Patch(':id')
  @Requires('users', 'update')
  update(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: ReturnType<typeof updateUserSchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<AdminUser> {
    return this.users.update(req.user!, req.scope, id, body, contextOf(req));
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @Requires('users', 'update')
  resetPassword(
    @Param('id', idPipe) id: string,
    @Req() req: AuthedRequest,
  ): Promise<TemporaryPasswordResult> {
    return this.users.resetPassword(req.user!, req.scope, id, contextOf(req));
  }

  @Post(':id/unlock')
  @HttpCode(200)
  @Requires('users', 'update')
  unlock(@Param('id', idPipe) id: string, @Req() req: AuthedRequest): Promise<AdminUser> {
    return this.users.unlock(req.user!, req.scope, id, contextOf(req));
  }
}
