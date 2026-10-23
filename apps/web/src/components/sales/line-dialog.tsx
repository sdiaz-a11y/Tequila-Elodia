'use client';

import { useState } from 'react';
import { saveLine } from '@/app/actions/sales';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { formatMoney2 } from '@/lib/format';
import {
  DEFAULT_TAX_RATE,
  FREE_DISCOUNT_PCT,
  lineAmounts,
  type DocLine,
  type VariantChoice,
} from '@/lib/sales';

interface State {
  variant_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_pct: string;
  tax_rate: string;
}

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Adds or edits a line. Picking a product fills in its current list price, which the line then keeps as
 * its own snapshot: later price-list changes never alter documents already made.
 */
export function LineDialog({
  kind,
  docId,
  line,
  variants,
  canManage,
  onClose,
  onSaved,
}: {
  kind: 'quote' | 'order';
  docId: string;
  line: DocLine | null;
  variants: VariantChoice[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [s, setS] = useState<State>(() => ({
    variant_id: line?.variant_id ?? '',
    description: line?.description ?? '',
    quantity: String(line?.quantity ?? 1),
    unit_price: String(line?.unit_price ?? ''),
    discount_pct: String(line?.discount_pct ?? 0),
    tax_rate: String(line?.tax_rate ?? DEFAULT_TAX_RATE),
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof State, v: string) => setS((p) => ({ ...p, [k]: v }));

  function pick(id: string) {
    const v = variants.find((x) => x.id === id);
    setS((p) => ({
      ...p,
      variant_id: id,
      description: v ? `${v.product} · ${v.presentation} (${v.sku})` : p.description,
      unit_price: v?.price != null ? String(v.price) : p.unit_price,
    }));
  }

  const amounts = lineAmounts({
    quantity: num(s.quantity),
    unit_price: num(s.unit_price),
    discount_pct: num(s.discount_pct),
    tax_rate: num(s.tax_rate),
  });
  const needsManager = num(s.discount_pct) > FREE_DISCOUNT_PCT && !canManage;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveLine(kind, docId, line?.id ?? null, {
      variant_id: s.variant_id || null,
      description: s.description,
      quantity: s.quantity,
      unit_price: s.unit_price,
      discount_pct: s.discount_pct,
      tax_rate: s.tax_rate,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo guardar.');
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,34rem)] overflow-y-auto">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              {line ? 'Editar línea' : 'Agregar línea'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              El precio, descuento e impuesto quedan guardados tal como los captures.
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
            id="l-variant"
            label="Producto (opcional)"
            hint="Elígelo para traer su precio de lista, o déjalo vacío para una línea libre."
          >
            {(a) => (
              <Select {...a} value={s.variant_id} onChange={(e) => pick(e.target.value)}>
                <option value="">Línea libre</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.product} · {v.presentation} ({v.sku})
                    {v.price != null ? ` — ${formatMoney2(v.price)}` : ''}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="l-desc" label="Descripción *">
            {(a) => (
              <Input
                {...a}
                value={s.description}
                onChange={(e) => set('description', e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="l-qty" label="Cantidad *">
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={s.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                />
              )}
            </Field>
            <Field id="l-price" label="Precio unitario (MXN) *">
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={s.unit_price}
                  onChange={(e) => set('unit_price', e.target.value)}
                />
              )}
            </Field>
            <Field
              id="l-disc"
              label="Descuento (%)"
              hint={`Hasta ${FREE_DISCOUNT_PCT} % sin autorización.`}
            >
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  value={s.discount_pct}
                  onChange={(e) => set('discount_pct', e.target.value)}
                />
              )}
            </Field>
            <Field id="l-tax" label="IVA (%)">
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  value={s.tax_rate}
                  onChange={(e) => set('tax_rate', e.target.value)}
                />
              )}
            </Field>
          </div>
          {needsManager ? (
            <p
              role="note"
              className="rounded-control border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-warning"
            >
              Un descuento mayor a {FREE_DISCOUNT_PCT} % lo autoriza la gerencia comercial: con tu
              rol no se podrá guardar.
            </p>
          ) : null}
          <dl className="tabular grid grid-cols-2 gap-x-4 gap-y-1 rounded-control border border-line bg-surface p-3.5 text-sm">
            <dt className="text-muted">Importe</dt>
            <dd className="text-right text-fg">{formatMoney2(amounts.net)}</dd>
            <dt className="text-muted">IVA</dt>
            <dd className="text-right text-fg">{formatMoney2(amounts.tax)}</dd>
            <dt className="font-medium text-fg">Total de la línea</dt>
            <dd className="text-right font-medium text-gold">{formatMoney2(amounts.total)}</dd>
          </dl>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {line ? 'Guardar línea' : 'Agregar línea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
