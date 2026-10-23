'use client';

import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import { ROLE_LABELS, type RoleKey, type SessionUser } from '@elodia/shared';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/utils';

export function UserMenu({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menú de ${user.name}`}
        className="grid size-9 place-items-center rounded-full bg-surface-2 text-xs font-semibold tracking-wide text-gold ring-1 ring-gold-deep transition-[box-shadow,background-color] hover:bg-surface-3 hover:ring-gold-2 data-[state=open]:ring-gold"
      >
        {initials(user.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <Badge key={r} tone="gold">
                {ROLE_LABELS[r as RoleKey] ?? r}
              </Badge>
            ))}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/cuenta/seguridad">
            <ShieldCheck aria-hidden />
            Seguridad de la cuenta
            {user.totpEnabled ? null : (
              <Badge tone="warning" className="ml-auto">
                Recomendado
              </Badge>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem danger onSelect={onSignOut}>
          <LogOut aria-hidden />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
