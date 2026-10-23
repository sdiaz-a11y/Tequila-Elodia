import { NextResponse, type NextRequest } from 'next/server';

// Both names: `__Host-` in production, plain on http://localhost. The API decides which one it issues.
const SESSION_COOKIES = ['__Host-elodia_session', 'elodia_session'];

/**
 * Fast path only: no session cookie at all → /login. The real validation happens in the API
 * (and again in the (app) layout), so a forged cookie gets nothing.
 */
export function proxy(req: NextRequest) {
  if (SESSION_COOKIES.some((name) => req.cookies.has(name))) return NextResponse.next();
  const url = new URL('/login', req.url);
  const target = req.nextUrl.pathname + req.nextUrl.search;
  if (target !== '/') url.searchParams.set('next', target);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api|_next|brand|favicon.ico|.*\\..*).*)'],
};
