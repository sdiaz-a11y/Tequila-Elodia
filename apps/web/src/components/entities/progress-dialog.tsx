'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addObjectiveUpdate,
  listObjectiveUpdates,
  type ObjectiveUpdateRow,
} from '@/app/actions/planning';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { formatDateTime } from '@/lib/format';

const n = (x: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(x);

/** Registers a new progress reading for an objective and shows its recent history. */
export function ProgressDialog({
  objective,
  onClose,
  onSaved,
}: {
  objective: { id: string; title: string; current_value: number; target: number; unit: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(objective.current_value));
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<ObjectiveUpdateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void listObjectiveUpdates(objective.id).then((rows) => alive && setHistory(rows));
    return () => {
      alive = false;
    };
  }, [objective.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await addObjectiveUpdate(objective.id, { value, note: note || null });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo registrar.');
    toast.success('Avance registrado');
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,30rem)] overflow-y-auto">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">Registrar avance</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {objective.title} · meta {n(objective.target)} {objective.unit}
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
          <Field
            id="pv"
            label={`Valor actual (${objective.unit || 'número'}) *`}
            hint="El total acumulado hoy, no solo lo nuevo."
          >
            {(a) => (
              <Input
                {...a}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </Field>
          <Field id="pn" label="Nota">
            {(a) => (
              <Input
                {...a}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          {history && history.length ? (
            <div className="grid gap-2">
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-faint">
                Historial reciente
              </p>
              <ul className="grid gap-1.5 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-muted">
                      {formatDateTime(h.created_at)}
                      {h.author ? ` · ${h.author}` : ''}
                      {h.note ? ` · ${h.note}` : ''}
                    </span>
                    <span className="tabular shrink-0 font-medium text-fg">{n(h.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Registrar avance
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
