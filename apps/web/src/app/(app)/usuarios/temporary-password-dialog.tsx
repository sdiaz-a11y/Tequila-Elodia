'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';
import type { AdminUser } from '@elodia/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * The only place the temporary password is ever shown. Closing it discards it for good:
 * the API stores just a hash and cannot show it again.
 */
export function TemporaryPasswordDialog({
  result,
  heading,
  onClose,
}: {
  result: { user: AdminUser; temporaryPassword: string } | null;
  heading: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the password stays selectable on screen.
    }
  }

  return (
    <Dialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[min(92vw,30rem)]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {result ? (
          <div className="grid gap-5 p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-gold">
                <KeyRound className="size-5" aria-hidden />
              </span>
              <div className="grid gap-1">
                <DialogTitle className="text-base font-semibold text-fg">{heading}</DialogTitle>
                <DialogDescription className="text-sm text-muted">
                  Para <span className="text-fg">{result.user.name}</span> ({result.user.email}).
                </DialogDescription>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-faint">
                Contraseña temporal
              </p>
              <div className="flex items-center gap-2 rounded-control border border-gold-deep bg-surface px-4 py-3">
                <code className="tabular flex-1 select-all break-all text-lg tracking-wider text-gold">
                  {result.temporaryPassword}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void copy()}
                  aria-label="Copiar contraseña"
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>

            <p
              role="note"
              className="flex items-start gap-2.5 rounded-control border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm text-warning"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Se muestra <strong>una sola vez</strong>: no queda guardada en ningún lado.
                Entrégala por un canal seguro. La persona deberá cambiarla al entrar por primera
                vez.
              </span>
            </p>

            <div className="flex justify-end">
              <Button type="button" variant="primary" onClick={onClose}>
                Ya la copié, cerrar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
