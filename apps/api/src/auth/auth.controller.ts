import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  totpDisableSchema,
  totpEnableSchema,
  type SessionUser,
} from '@elodia/shared';
import { APP_ENV, type AppEnv } from '../core/config/env';
import { ZodValidationPipe } from '../core/validation/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  AllowPendingPasswordChange,
  Authenticated,
  Public,
  type AuthedRequest,
  type RequestContext,
} from './auth.types';
import { clearSessionCookie, readCookie, sessionCookieName, setSessionCookie } from './cookies';

const contextOf = (req: AuthedRequest): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  /** Rate limited by the `login` throttler (see AppModule). */
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: ReturnType<typeof loginSchema.parse>,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SessionUser }> {
    const { token, expiresAt, user } = await this.auth.login(body, contextOf(req));
    setSessionCookie(res, this.env, token, expiresAt);
    return { user };
  }

  @Authenticated()
  @AllowPendingPasswordChange()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(this.token(req), req.user!, contextOf(req));
    clearSessionCookie(res, this.env);
  }

  @Authenticated()
  @AllowPendingPasswordChange()
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ revoked: number }> {
    const revoked = await this.auth.logoutAll(req.user!, contextOf(req));
    clearSessionCookie(res, this.env);
    return { revoked };
  }

  @Authenticated()
  @AllowPendingPasswordChange()
  @Get('me')
  me(@Req() req: AuthedRequest): { user: SessionUser } {
    return { user: req.user! };
  }

  /** Replaces the password (also the way out of a temporary one). Other sessions are revoked. */
  @Authenticated()
  @AllowPendingPasswordChange()
  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ReturnType<typeof changePasswordSchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    await this.auth.changePassword(req.user!, body, contextOf(req), this.token(req));
  }

  @Authenticated()
  @Post('2fa/setup')
  @HttpCode(200)
  totpSetup(@Req() req: AuthedRequest) {
    return this.auth.totpSetup(req.user!);
  }

  @Authenticated()
  @Post('2fa/enable')
  @HttpCode(204)
  async totpEnable(
    @Body(new ZodValidationPipe(totpEnableSchema)) body: ReturnType<typeof totpEnableSchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    await this.auth.totpEnable(req.user!, body.code, contextOf(req), this.token(req));
  }

  @Authenticated()
  @Post('2fa/disable')
  @HttpCode(204)
  async totpDisable(
    @Body(new ZodValidationPipe(totpDisableSchema))
    body: ReturnType<typeof totpDisableSchema.parse>,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    await this.auth.totpDisable(req.user!, body.password, body.code, contextOf(req));
  }

  private token(req: AuthedRequest): string {
    return readCookie(req, sessionCookieName(this.env))!;
  }
}
