import { SetMetadata } from '@nestjs/common';
import type { Action, Resource, Scope, SessionUser } from '@elodia/shared';
import type { RequestWithId } from '../core/http/request-id.middleware';

export type AuthedRequest = RequestWithId & {
  user?: SessionUser;
  sessionId?: string;
  /** Widest scope granted for the matched @Requires permission. */
  scope?: Scope;
};

export const IS_PUBLIC = 'auth:public';
export const IS_AUTHENTICATED = 'auth:authenticated';
export const REQUIRES = 'auth:requires';
export const ALLOW_PASSWORD_CHANGE = 'auth:allow-password-change';

/** No session needed. Everything else is denied by default. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Any valid session, no specific permission (e.g. /auth/me). */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED, true);
/** Session + `resource:action` permission. A route with none of these decorators is rejected with 403. */
export const Requires = (resource: Resource, action: Action) =>
  SetMetadata(REQUIRES, { resource, action });

/** Reachable while a temporary password is pending: /auth/me, logout and the password change itself. */
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE, true);

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}
