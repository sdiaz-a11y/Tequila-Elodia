'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Plus,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { recordMovement } from '@/app/actions/inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';

export interface StockRow {
  variantId: string;
  sku: string;
  product: string;
  presentation: string;
  minStock: number | null;
  onHand: number;
  reserved: number;
  available: number;
  byWarehouse: { name: string; onHand: number; reserved: number }[];
}
export interface MovementRow {
  id: string;
  created_at: string;
  kind: string;
  qty: number;
  reason: string | null;
  sku: string;
  warehouse: string;
  lot: string | null;
  who: string | null;
}
export interface Choice {
  value: string;
  label: string;
}
export interface LotChoice extends Choice {
  variantId: string;
}

const KIND_LABEL: Record<string, string> = {
  in: 'Entrada',
  out: 'Salida',
  adjust: 'Ajuste',
  reserve: 'Apartado',
  release: 'Liberación',
};
const KIND_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'gold'> = {
  in: 'success',
  out: 'danger',
  adjust: 'warning',
  reserve: 'gold',
  release: 'neutral',
};
const n = (x: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(x);

export function InventoryPanel({
  stock,
  movements,
  variants,
  warehouses,
  lots,
  canEdit,
}: {
  stock: StockRow[];
  movements: MovementRow[];
  variants: Choice[];
  warehouses: Choice[];
  lots: LotChoice[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<null | 'in' | 'out' | 'adjust'>(null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setOpen('in')}>
            <ArrowDownToLine aria-hidden />
            Registrar entrada
          </Button>
          <Button variant="secondary" onClick={() => setOpen('out')}>
            <ArrowUpFromLine aria-hidden />
            Registrar salida
          </Button>
          <Button variant="secondary" onClick={() => setOpen('adjust')}>
            <SlidersHorizontal aria-hidden />
            Ajuste de inventario
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Existencias</CardTitle>
          <CardDescription>
            En existencia, apartado para pedidos confirmados y disponible para vender, por
            presentación.
          </CardDescription>
        </CardHeader>
        {stock.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Aún no hay presentaciones"
            description="Registra tus productos y presentaciones (SKU) y después las entradas de inventario."
            className="py-10"
          />
        ) : (
          <>
            <TableWrap className="hidden md:block">
              <Table aria-label="Existencias">
                <THead>
                  <tr>
                    <TH>Presentación</TH>
                    <TH className="text-right">En existencia</TH>
                    <TH className="text-right">Apartado</TH>
                    <TH className="text-right">Disponible</TH>
                    <TH>Por almacén</TH>
                  </tr>
                </THead>
                <tbody>
                  {stock.map((s) => {
                    const low = s.minStock !== null && s.available < s.minStock;
                    return (
                      <TR key={s.variantId}>
                        <TD>
                          <p className="font-medium">{s.product}</p>
                          <p className="text-[0.8125rem] text-muted">
                            {s.presentation} · {s.sku}
                          </p>
                        </TD>
                        <TD className="tabular text-right">{n(s.onHand)}</TD>
                        <TD className="tabular text-right text-muted">{n(s.reserved)}</TD>
                        <TD className="tabular text-right font-medium">
                          {n(s.available)}
                          {low ? (
                            <Badge tone="warning" className="ml-2">
                              <TriangleAlert className="size-3" aria-hidden />
                              Bajo
                            </Badge>
                          ) : null}
                        </TD>
                        <TD className="text-[0.8125rem] text-muted">
                          {s.byWarehouse.length
                            ? s.byWarehouse.map((w) => `${w.name}: ${n(w.onHand)}`).join(' · ')
                            : '—'}
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
            <ul className="grid divide-y divide-line md:hidden" aria-label="Existencias">
              {stock.map((s) => {
                const low = s.minStock !== null && s.available < s.minStock;
                return (
                  <li key={s.variantId} className="grid gap-2 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-fg">{s.product}</p>
                        <p className="text-[0.8125rem] text-muted">
                          {s.presentation} · {s.sku}
                        </p>
                      </div>
                      {low ? <Badge tone="warning">Bajo</Badge> : null}
                    </div>
                    <p className="tabular text-sm text-muted">
                      <span className="text-base font-semibold text-fg">{n(s.available)}</span>{' '}
                      disponibles · {n(s.onHand)} en existencia · {n(s.reserved)} apartadas
                    </p>
                    {s.byWarehouse.length ? (
                      <p className="text-xs text-faint">
                        {s.byWarehouse.map((w) => `${w.name}: ${n(w.onHand)}`).join(' · ')}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Últimos movimientos</CardTitle>
          <CardDescription>
            El libro solo se agrega: una corrección es un nuevo ajuste con su motivo.
          </CardDescription>
        </CardHeader>
        {movements.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="Aquí aparecerá cada entrada, salida, ajuste y apartado."
            className="py-8"
          />
        ) : (
          <>
            <TableWrap className="hidden md:block">
              <Table aria-label="Últimos movimientos">
                <THead>
                  <tr>
                    <TH>Fecha</TH>
                    <TH>Movimiento</TH>
                    <TH>SKU</TH>
                    <TH>Almacén</TH>
                    <TH className="text-right">Cantidad</TH>
                    <TH>Motivo</TH>
                  </tr>
                </THead>
                <tbody>
                  {movements.map((m) => (
                    <TR key={m.id}>
                      <TD className="tabular whitespace-nowrap text-muted">
                        {formatDateTime(m.created_at)}
                      </TD>
                      <TD>
                        <Badge tone={KIND_TONE[m.kind] ?? 'neutral'}>
                          {KIND_LABEL[m.kind] ?? m.kind}
                        </Badge>
                      </TD>
                      <TD>{m.sku}</TD>
                      <TD className="text-muted">{m.warehouse}</TD>
                      <TD className="tabular text-right">{n(m.qty)}</TD>
                      <TD className="text-muted">{m.reason ?? '—'}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <ul className="grid divide-y divide-line md:hidden" aria-label="Últimos movimientos">
              {movements.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="grid gap-0.5">
                    <span className="flex items-center gap-2 text-sm text-fg">
                      <Badge tone={KIND_TONE[m.kind] ?? 'neutral'}>
                        {KIND_LABEL[m.kind] ?? m.kind}
                      </Badge>
                      {m.sku}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDateTime(m.created_at)} · {m.warehouse}
                      {m.reason ? ` · ${m.reason}` : ''}
                    </span>
                  </div>
                  <span className="tabular text-sm font-medium text-fg">{n(m.qty)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {open ? (
        <MovementDialog
          kind={open}
          variants={variants}
          warehouses={warehouses}
          lots={lots}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            toast.success('Movimiento registrado');
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function MovementDialog({
  kind,
  variants,
  warehouses,
  lots,
  onClose,
  onSaved,
}: {
  kind: 'in' | 'out' | 'adjust';
  variants: Choice[];
  warehouses: Choice[];
  lots: LotChoice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [variantId, setVariantId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.value ?? '');
  const [lotId, setLotId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const title =
    kind === 'in'
      ? 'Registrar entrada'
      : kind === 'out'
        ? 'Registrar salida'
        : 'Ajuste de inventario';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await recordMovement({
      kind,
      variant_id: variantId,
      warehouse_id: warehouseId,
      lot_id: lotId || null,
      qty,
      reason: reason || null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo registrar.');
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,32rem)] overflow-y-auto">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {kind === 'adjust'
                ? 'Usa un número negativo para restar. El motivo es obligatorio y queda registrado.'
                : 'No se permiten existencias negativas ni sacar lo que está apartado para un pedido.'}
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
          <Field id="m-variant" label="Presentación *">
            {(a) => (
              <Select
                {...a}
                value={variantId}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setLotId('');
                }}
              >
                <option value="">Elige una presentación…</option>
                {variants.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="m-wh"
            label="Almacén *"
            hint={warehouses.length ? undefined : 'Primero registra un almacén activo.'}
          >
            {(a) => (
              <Select {...a} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="m-lot" label="Lote (opcional)">
            {(a) => (
              <Select {...a} value={lotId} onChange={(e) => setLotId(e.target.value)}>
                <option value="">Sin lote</option>
                {lots
                  .filter((l) => l.variantId === variantId)
                  .map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field id="m-qty" label="Cantidad *">
            {(a) => (
              <Input
                {...a}
                type="number"
                step="0.01"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            )}
          </Field>
          <Field id="m-reason" label={kind === 'adjust' ? 'Motivo *' : 'Motivo o referencia'}>
            {(a) => (
              <Input
                {...a}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={!warehouses.length}>
              <Plus aria-hidden />
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
