'use client';

import { createContext, useContext } from 'react';
import type { SessionUser } from '@elodia/shared';

const SessionContext = createContext<SessionUser | null>(null);

/** Hands the user resolved on the server to client components. */
export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useSession must be used inside the signed-in layout');
  return user;
}
