'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setAutomation } from '@/app/actions/inventory';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Automation {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
}

/** Each automation is a switch in the database; the rules themselves run there, so they cannot be skipped from the browser. */
export function AutomationList({ items, canEdit }: { items: Automation[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(a: Automation) {
    setBusy(a.key);
    const res = await setAutomation(a.key, !a.enabled);
    setBusy(null);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo cambiar.');
    toast.success(a.enabled ? 'Automatización desactivada' : 'Automatización activada');
    router.refresh();
  }

  return (
    <ul className="grid gap-4">
      {items.map((a) => (
        <li key={a.key}>
          <Card className="flex items-start justify-between gap-4 p-5">
            <div className="grid gap-1.5">
              <h2 className="text-base font-semibold text-fg">{a.title}</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted">{a.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={a.enabled}
              aria-label={`${a.enabled ? 'Desactivar' : 'Activar'}: ${a.title}`}
              disabled={!canEdit || busy === a.key}
              onClick={() => void toggle(a)}
              className={cn(
                'relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                a.enabled ? 'border-gold-2 bg-gold/30' : 'border-line bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'inline-block size-5 rounded-full transition-transform',
                  a.enabled ? 'translate-x-6 bg-gold' : 'translate-x-1 bg-faint',
                )}
              />
            </button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
