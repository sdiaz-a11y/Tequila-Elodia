'use client';

import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import type { SessionUser } from '@elodia/shared';
import { TooltipProvider } from '@/components/ui/tooltip';

export const SESSION_KEY = ['session'] as const;

export function AppProviders({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: SessionUser;
}) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
    });
    if (user) qc.setQueryData(SESSION_KEY, user);
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: '!rounded-panel !border !border-line !bg-surface-2 !text-fg !shadow-pop',
                description: '!text-muted',
              },
            }}
          />
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
