'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getNotifications, type NotificationItem } from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DOT = { danger: 'bg-danger', warn: 'bg-gold', info: 'bg-muted' } as const;

/** Alerts computed from live data: overdue work, expiring documents, low stock, pending reviews. */
export function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => void getNotifications().then(setItems), []);

  useEffect(() => {
    load();
  }, [load]);

  const count = items?.length ?? 0;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
          <Bell aria-hidden />
          {count ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold" aria-hidden />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="border-b border-line px-4 py-3 text-sm font-medium">Notificaciones</div>
        {count ? (
          <ul className="grid">
            {items!.map((n) => (
              <li key={n.key}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 text-sm text-fg hover:bg-surface-2"
                >
                  <span
                    className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.tone])}
                    aria-hidden
                  />
                  {n.text}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid place-items-center gap-2 px-6 py-10 text-center">
            <Bell className="size-5 text-faint" aria-hidden />
            <p className="text-sm text-fg">Todo al día</p>
            <p className="text-[0.8125rem] text-muted">
              Aquí aparecerán tareas vencidas, documentos por vencer, stock bajo y aprobaciones
              pendientes.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
