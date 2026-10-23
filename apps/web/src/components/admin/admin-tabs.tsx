'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/usuarios', label: 'Usuarios' },
  { href: '/usuarios/roles', label: 'Roles y permisos' },
] as const;

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de administración" className="flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-gold text-fg'
                : 'border-transparent text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
