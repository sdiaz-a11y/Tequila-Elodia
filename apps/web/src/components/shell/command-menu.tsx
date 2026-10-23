'use client';

import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui';
import { LogOut, Search, ShieldCheck } from 'lucide-react';
import type { SessionUser } from '@elodia/shared';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ACCOUNT_PAGES, COMING_SOON_LABEL, visibleNav } from '@/lib/nav';
import { cn } from '@/lib/utils';

const item =
  'flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted outline-none data-[selected=true]:bg-surface-3 data-[selected=true]:text-fg data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 [&_svg]:size-4 [&_svg]:text-faint data-[selected=true]:[&_svg]:text-gold';

export function CommandMenu({
  open,
  onOpenChange,
  user,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" aria-describedby={undefined}>
        <VisuallyHidden.Root>
          <DialogPrimitive.Title>Buscar módulos y acciones</DialogPrimitive.Title>
        </VisuallyHidden.Root>
        <Command
          label="Buscar módulos y acciones"
          className="flex max-h-[min(28rem,70vh)] flex-col"
        >
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 text-faint" aria-hidden />
            <Command.Input
              autoFocus
              placeholder="Buscar módulos y acciones…"
              className="h-14 flex-1 bg-transparent text-[0.9375rem] text-fg outline-none placeholder:text-faint"
            />
            <kbd className="rounded border border-line px-1.5 py-0.5 text-[0.6875rem] text-faint">
              Esc
            </kbd>
          </div>
          <Command.List className="overflow-y-auto p-2">
            <Command.Empty className="px-3 py-10 text-center text-sm text-muted">
              No hay resultados. Prueba con otro nombre de módulo.
            </Command.Empty>
            {visibleNav(user).map((group) => (
              <Command.Group
                key={group.label}
                heading={group.label}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-faint"
              >
                {group.items.map((nav) => (
                  <Command.Item
                    key={nav.href}
                    value={`${group.label} ${nav.label}`}
                    disabled={nav.status === 'soon'}
                    onSelect={() => go(nav.href)}
                    className={item}
                  >
                    <nav.icon aria-hidden />
                    <span className="flex-1">{nav.label}</span>
                    {nav.status === 'soon' ? (
                      <span className="text-[0.6875rem] text-faint">{COMING_SOON_LABEL}</span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
            <Command.Group
              heading="Cuenta"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-faint"
            >
              {ACCOUNT_PAGES.map((page) => (
                <Command.Item
                  key={page.href}
                  value={`Cuenta ${page.label} 2fa verificación`}
                  onSelect={() => go(page.href)}
                  className={item}
                >
                  <ShieldCheck aria-hidden />
                  <span className="flex-1">{page.label}</span>
                </Command.Item>
              ))}
              <Command.Item
                value="Cuenta cerrar sesión salir"
                onSelect={() => {
                  onOpenChange(false);
                  onSignOut();
                }}
                className={cn(
                  item,
                  'data-[selected=true]:text-danger data-[selected=true]:[&_svg]:text-danger',
                )}
              >
                <LogOut aria-hidden />
                <span className="flex-1">Cerrar sesión</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
