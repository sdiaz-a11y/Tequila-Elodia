'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@elodia/shared';
import { api } from '@/lib/api';
import { SESSION_KEY } from '@/components/providers';

/** Seeds the client cache with the user resolved on the server, so there is no loading flash. */
export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  useState(() => {
    qc.setQueryData(SESSION_KEY, user);
    return null;
  });
  return children;
}

/** The signed-in user. Refetches after changes such as enabling 2FA (`invalidateQueries(SESSION_KEY)`). */
export function useSession(): SessionUser {
  const { data } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => (await api<{ user: SessionUser }>('/auth/me')).user,
  });
  // The (app) layout guarantees a session before rendering; the cache is seeded by SessionProvider.
  return data as SessionUser;
}
