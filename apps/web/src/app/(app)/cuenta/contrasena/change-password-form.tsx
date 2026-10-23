'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { changePassword } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 12) return setError('La nueva contraseña debe tener al menos 12 caracteres.');
    if (next !== confirm) return setError('Las contraseñas nuevas no coinciden.');
    setSaving(true);
    const res = await changePassword({ currentPassword: current, newPassword: next });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo cambiar la contraseña.');
    setCurrent('');
    setNext('');
    setConfirm('');
    toast.success('Contraseña actualizada');
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-5">
      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      <Field id="current" label="Contraseña actual">
        {(a) => (
          <Input
            {...a}
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
      </Field>
      <Field id="new" label="Nueva contraseña" hint="Mínimo 12 caracteres.">
        {(a) => (
          <Input
            {...a}
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        )}
      </Field>
      <Field id="confirm" label="Repite la nueva contraseña">
        {(a) => (
          <Input
            {...a}
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={saving}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
