'use client';

import { useState, useTransition } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { revokeCalendarToken, rotateCalendarToken } from '@/app/actions/integrations';
import { Button } from '@/components/ui/button';

export function CalendarLink({
  origin,
  initialToken,
}: {
  origin: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [pending, start] = useTransition();
  const url = token ? `${origin}/api/calendar/${token}.ics` : null;

  function generate() {
    start(async () => {
      const res = await rotateCalendarToken();
      if (res.ok && res.token) {
        setToken(res.token);
        toast.success(token ? 'Enlace nuevo: el anterior dejó de funcionar' : 'Enlace creado');
      } else toast.error(res.error ?? 'No se pudo crear el enlace.');
    });
  }

  function revoke() {
    start(async () => {
      const res = await revokeCalendarToken();
      if (res.ok) {
        setToken(null);
        toast.success('Enlace desactivado');
      } else toast.error(res.error ?? 'No se pudo desactivar.');
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar. Selecciónalo y cópialo a mano.');
    }
  }

  return (
    <div className="grid gap-4">
      {url ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <code
              data-calendar-url
              className="min-w-0 flex-1 select-all break-all rounded-control border border-line bg-surface-2 px-3 py-2 text-xs text-muted"
            >
              {url}
            </code>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Copiar enlace"
              onClick={() => void copy()}
            >
              <Copy aria-hidden />
            </Button>
          </div>
          <p className="text-xs text-faint">
            Es privado: quien tenga el enlace ve tu calendario. En Google Calendar: Otros
            calendarios → Desde URL. En iPhone: Ajustes → Calendario → Cuentas → Añadir calendario
            suscrito.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Aún no tienes un enlace.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={pending} onClick={generate}>
          {token ? 'Generar enlace nuevo' : 'Crear mi enlace'}
        </Button>
        {token ? (
          <Button variant="ghost" disabled={pending} onClick={revoke}>
            Desactivar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
