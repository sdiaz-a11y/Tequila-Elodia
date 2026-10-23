import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { permissionKey, type Action, type Resource } from '@elodia/shared';
import { APP_ENV, type AppEnv } from '../core/config/env';
import { IS_AUTHENTICATED, IS_PUBLIC, REQUIRES, type AuthedRequest } from './auth.types';
import { readCookie, sessionCookieName } from './cookies';
import { SessionsService } from './sessions.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-elodia-csrf';

const flag = (reflector: Reflector, key: string, ctx: ExecutionContext): boolean =>
  reflector.getAllAndOverride<boolean>(key, [ctx.getHandler(), ctx.getClass()]) === true;

/**
 * CSRF defence for cookie sessions, on top of SameSite=Lax: unsafe methods must carry a custom header
 * (which browsers will not send cross-origin without a CORS preflight we only grant to WEB_ORIGIN)
 * and, when the browser sends an Origin, it must be one of ours.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly env: AppEnv) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin && !this.env.WEB_ORIGIN.includes(origin))
      throw new ForbiddenException('Origen no permitido');
    if (!req.header(CSRF_HEADER))
      throw new ForbiddenException('Falta el encabezado de protección CSRF');
    return true;
  }
}

/** Deny-by-default step 1: every route needs a valid session unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http' || flag(this.reflector, IS_PUBLIC, context)) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = readCookie(req, sessionCookieName(this.env));
    const authed = token ? await this.sessions.authenticate(token) : null;
    if (!authed) throw new UnauthorizedException('Inicia sesión para continuar');
    req.user = authed.user;
    req.sessionId = authed.sessionId;
    return true;
  }
}

/** Deny-by-default step 2: an authenticated route must declare @Requires(resource, action) or @Authenticated(). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    if (flag(this.reflector, IS_PUBLIC, context) || flag(this.reflector, IS_AUTHENTICATED, context))
      return true;
    const required = this.reflector.getAllAndOverride<{ resource: Resource; action: Action }>(
      REQUIRES,
      [context.getHandler(), context.getClass()],
    );
    // No declaration = the route was never reviewed for authorization = denied.
    if (!required) throw new ForbiddenException('Acceso denegado');
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const scope = req.user?.permissions[permissionKey(required.resource, required.action)];
    if (!scope) throw new ForbiddenException('No tienes permiso para esta acción');
    req.scope = scope;
    return true;
  }
}
