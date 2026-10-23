'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Notifications module lands with tasks/approvals; until then the inbox is honestly empty. */
export function Notifications() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificaciones">
          <Bell aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="border-b border-line px-4 py-3 text-sm font-medium">Notificaciones</div>
        <div className="grid place-items-center gap-2 px-6 py-10 text-center">
          <Bell className="size-5 text-faint" aria-hidden />
          <p className="text-sm text-fg">Sin notificaciones</p>
          <p className="text-[0.8125rem] text-muted">
            Aquí aparecerán avisos de tareas vencidas, aprobaciones pendientes y documentos por
            vencer.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
