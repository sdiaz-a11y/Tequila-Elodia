'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { sendQuoteEmail } from '@/app/actions/sales';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';

/** Emails the quote to the customer; the send is recorded as an activity on the company. */
export function EmailDialog({
  open,
  quoteId,
  number,
  defaultTo,
  onClose,
  onSent,
}: {
  open: boolean;
  quoteId: string;
  number: string;
  defaultTo: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState(defaultTo);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await sendQuoteEmail(quoteId, { to, message });
    setSending(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo enviar.');
    toast.success('Cotización enviada por correo');
    onSent();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="w-[min(94vw,30rem)]">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              Enviar {number} por correo
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              El cliente recibe el detalle de la cotización y puede responderte directo a tu correo.
            </DialogDescription>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
          <Field id="e-to" label="Correo del cliente *">
            {(a) => (
              <Input
                {...a}
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoComplete="off"
                required
              />
            )}
          </Field>
          <Field id="e-msg" label="Mensaje (opcional)">
            {(a) => (
              <Input
                {...a}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoComplete="off"
                maxLength={1000}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={sending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={sending}>
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
