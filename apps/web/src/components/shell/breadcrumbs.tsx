'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { breadcrumbsFor } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Breadcrumbs() {
  const crumbs = breadcrumbsFor(usePathname());
  return (
    <nav aria-label="Ruta de navegación" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li
              key={`${c.label}-${i}`}
              className={cn('min-w-0 items-center gap-1.5', last ? 'flex' : 'hidden sm:flex')}
            >
              {i > 0 ? (
                <ChevronRight
                  className="hidden size-3.5 shrink-0 text-faint sm:block"
                  aria-hidden
                />
              ) : null}
              {c.href && !last ? (
                <Link href={c.href} className="truncate text-muted transition-colors hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'truncate font-medium text-fg' : 'truncate text-muted'}
                >
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
