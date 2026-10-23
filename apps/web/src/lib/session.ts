import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SessionUser } from '@elodia/shared';

/** Server-side API origin (the browser never sees it: it talks to /api/v1 on the web origin). */
// Trailing slashes are dropped: on Vercel the value comes from a service binding.
export const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

/**
 * Resolves the signed-in user on the server by forwarding the session cookie to the API.
 * Deduplicated per request. Returns null when there is no valid session.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`No se pudo verificar la sesión (${res.status})`);
  return ((await res.json()) as { user: SessionUser }).user;
});
