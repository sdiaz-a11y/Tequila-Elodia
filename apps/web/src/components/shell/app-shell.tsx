'use client';

import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui';
import { Menu, Search, X } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, SheetContent } from '@/components/ui/dialog';
import { logout } from '@/app/actions/auth';
import { findNavItem } from '@/lib/nav';
import { useSession } from '@/lib/session-client';
import { Breadcrumbs } from './breadcrumbs';
import { CommandMenu } from './command-menu';
import { BottleBadge } from '@/components/brand/bottle-badge';
import { Notifications } from './notifications';
import { PeriodSelect } from './period-select';
import { Sidebar, SidebarNav } from './sidebar';
import { UserMenu } from './user-menu';

const SIDEBAR_COOKIE = 'elodia_sidebar';

const noopSubscribe = () => () => {};
/** ⌘ on Apple platforms, Ctrl elsewhere. Server snapshot is `false`, so hydration never mismatches. */
function useIsApple(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
}

export function AppShell({
  children,
  initialCollapsed,
}: {
  children: React.ReactNode;
  initialCollapsed: boolean;
}) {
  const user = useSession();
  const isApple = useIsApple();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const usesPeriod = findNavItem(pathname)?.item.usesPeriod === true;

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      document.cookie = `${SIDEBAR_COOKIE}=${c ? '0' : '1'}; path=/; max-age=31536000; samesite=lax`;
      return !c;
    });
  }, []);

  const signOut = useCallback(async () => {
    queryClient.clear();
    await logout();
  }, [queryClient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-control bg-gold px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      <Sidebar user={user} collapsed={collapsed} onToggle={toggleSidebar} />

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent aria-describedby={undefined} className="flex flex-col lg:hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Navegación</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="flex h-[var(--header-height)] shrink-0 items-center px-6">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              aria-label="ELODIA OS, ir al inicio"
            >
              <Wordmark />
            </Link>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                aria-label="Cerrar navegación"
              >
                <X aria-hidden />
              </Button>
            </DialogClose>
          </div>
          <SidebarNav
            user={user}
            collapsed={false}
            scope="mobile"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center gap-1.5 border-b border-line bg-background/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir navegación"
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              aria-label="Buscar módulos y acciones"
              className="hidden h-9 w-64 items-center gap-2.5 rounded-control border border-line bg-surface/70 px-3 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted md:flex"
            >
              <Search className="size-4" aria-hidden />
              <span className="flex-1 text-left">Buscar o ir a…</span>
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[0.6875rem]">
                {isApple ? '⌘ K' : 'Ctrl K'}
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Buscar módulos y acciones"
              onClick={() => setCommandOpen(true)}
            >
              <Search aria-hidden />
            </Button>
            {usesPeriod ? (
              <Suspense fallback={<div className="skeleton h-8 w-28" />}>
                <PeriodSelect />
              </Suspense>
            ) : null}
            <BottleBadge className="h-[3.25rem] w-10 sm:w-11" />
            <div className="hidden sm:block">
              <Notifications />
            </div>
            <UserMenu user={user} onSignOut={signOut} />
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-8 outline-none sm:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        user={user}
        onSignOut={signOut}
      />
    </div>
  );
}
