'use client';

import { useState } from 'react';
import type { SaveResult } from '@/app/actions/entities';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import {
  isoToLocal,
  type EntityDef,
  type Field as FieldDef,
  type Option,
  type RelationKey,
} from '@/lib/entities';

type Row = Record<string, unknown>;
type Values = Record<string, string | boolean>;

const textarea =
  'min-h-24 w-full resize-y rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-faint transition-[border-color,box-shadow] hover:border-line-strong focus-visible:border-gold-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

function initial(def: EntityDef, row: Row | null, preset: Row | undefined): Values {
  const v: Values = {};
  for (const f of def.fields) {
    const raw = row ? row[f.name] : preset?.[f.name];
    if (f.type === 'checkbox') v[f.name] = Boolean(raw);
    else if (f.type === 'datetime') v[f.name] = isoToLocal(raw as string | null);
    else if (raw !== null && raw !== undefined) v[f.name] = String(raw);
    else if (f.type === 'select') v[f.name] = f.options?.[0]?.value ?? '';
    else v[f.name] = '';
  }
  return v;
}

const inputType = (f: FieldDef): string =>
  f.type === 'datetime' ? 'datetime-local' : f.type === 'number' ? 'number' : f.type;

/** Form generated from the entity definition. Mount it with a `key` per row: state starts fresh each time it opens. The server validates again, so this is only for guidance. */
export function EntityFormDialog({
  def,
  row,
  open,
  relations,
  preset,
  onClose,
  onSaved,
  save,
}: {
  def: EntityDef;
  row: Row | null;
  open: boolean;
  relations: Partial<Record<RelationKey, Option[]>>;
  /** Initial values for a new row (e.g. the stage of the column where "add" was pressed). */
  preset?: Row;
  onClose: () => void;
  onSaved: () => void;
  save: (id: string | null, values: Values) => Promise<SaveResult>;
}) {
  const editing = row !== null;
  const [values, setValues] = useState<Values>(() => initial(def, row, preset));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (name: string, value: string | boolean) =>
    setValues((p) => ({ ...p, [name]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await save(editing ? (row.id as string) : null, values);
      if (res.ok) return onSaved();
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error ?? 'No se pudo guardar.');
    } catch {
      setFormError('No se pudo contactar al servidor. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const fields = def.fields.filter((f) => !(editing && f.lockOnEdit));
  const title = `${editing ? 'Editar' : def.isFeminine ? 'Nueva' : 'Nuevo'} ${def.singular}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,36rem)] overflow-y-auto">
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              Los campos con * son obligatorios.
            </DialogDescription>
          </div>
          {formError ? (
            <p
              role="alert"
              className="rounded-control border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            >
              {formError}
            </p>
          ) : null}

          {fields.map((f) => {
            const id = `f-${def.key}-${f.name}`;
            const label = f.required ? `${f.label} *` : f.label;
            if (f.type === 'checkbox')
              return (
                <label key={f.name} className="flex items-center gap-2.5 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.name])}
                    onChange={(e) => set(f.name, e.target.checked)}
                    className="size-4 accent-[var(--gold-primary)]"
                  />
                  {f.label}
                </label>
              );
            return (
              <Field key={f.name} id={id} label={label} hint={f.hint} error={errors[f.name]}>
                {({ invalid, ...a11y }) => {
                  const value = String(values[f.name] ?? '');
                  if (f.type === 'textarea')
                    return (
                      <textarea
                        {...a11y}
                        aria-invalid={invalid || undefined}
                        className={textarea}
                        value={value}
                        onChange={(e) => set(f.name, e.target.value)}
                      />
                    );
                  if (f.type === 'select' || f.type === 'relation') {
                    const list =
                      f.type === 'select' ? (f.options ?? []) : (relations[f.relation!] ?? []);
                    return (
                      <Select
                        {...a11y}
                        invalid={invalid}
                        value={value}
                        onChange={(e) => set(f.name, e.target.value)}
                      >
                        {f.type === 'relation' ? (
                          <option value="">
                            {f.required ? 'Elige una opción…' : 'Sin asignar'}
                          </option>
                        ) : null}
                        {list.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    );
                  }
                  return (
                    <Input
                      {...a11y}
                      invalid={invalid}
                      type={inputType(f)}
                      step={f.type === 'number' ? '0.01' : undefined}
                      min={f.type === 'number' ? 0 : undefined}
                      autoComplete="off"
                      value={value}
                      onChange={(e) => set(f.name, e.target.value)}
                    />
                  );
                }}
              </Field>
            );
          })}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
