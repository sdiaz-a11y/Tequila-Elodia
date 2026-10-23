import type { CookieOptions, Request, Response } from 'express';
import type { AppEnv } from '../core/config/env';

/** `__Host-` pins the cookie to the exact host over HTTPS with Path=/ (no subdomain override). Plain name on http://localhost. */
export const sessionCookieName = (env: Pick<AppEnv, 'NODE_ENV'>): string =>
  env.NODE_ENV === 'production' ? '__Host-elodia_session' : 'elodia_session';

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const baseOptions = (env: Pick<AppEnv, 'NODE_ENV'>): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});

export function setSessionCookie(
  res: Response,
  env: Pick<AppEnv, 'NODE_ENV'>,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(sessionCookieName(env), token, { ...baseOptions(env), expires: expiresAt });
}

export function clearSessionCookie(res: Response, env: Pick<AppEnv, 'NODE_ENV'>): void {
  res.clearCookie(sessionCookieName(env), baseOptions(env));
}
