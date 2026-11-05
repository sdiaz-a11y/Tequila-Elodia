'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  History,
  Pencil,
  Plus,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { correctMovement, recordMovement } from '@/app/actions/inventory';
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
export interface MovementEdit {
  id: string;
  created_at: string;
  reason: string | null;
  who: string | null;
  from: number;
  to: number;
}
export interface MovementRow {
  id: string;
  created_at: string;
  kind: string;
  /** Current quantity, after any corrections. */
  qty: number;
  /** Quantity as first saved. */
  originalQty: number;
  reason: string | null;
  sku: string;
  warehouse: string;
  lot: string | null;
  who: string | null;
  /** Entries, exits and manual adjustments can be edited; order reservations cannot. */
  editable: boolean;
  history: MovementEdit[];
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
  const [editing, setEditing] = useState<MovementRow | null>(null);
  const [viewing, setViewing] = useState<MovementRow | null>(null);

  const qtyCell = (m: MovementRow) => (
    <span className="inline-flex items-baseline gap-2">
      {m.history.length ? (
        <span className="tabular text-xs text-faint line-through">{n(m.originalQty)}</span>
      ) : null}
      <span className="tabular font-medium text-fg">{n(m.qty)}</span>
    </span>
  );

  const actions = (m: MovementRow) => (
    <span className="flex items-center justify-end gap-1">
      {m.history.length ? (
        <Badge tone="gold" className="mr-1">
          Editado
        </Badge>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Historial del movimiento ${m.sku}`}
        onClick={() => setViewing(m)}
      >
        <History aria-hidden />
      </Button>
      {canEdit && m.editable ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar el movimiento ${m.sku}`}
          onClick={() => setEditing(m)}
        >
          <Pencil aria-hidden />
        </Button>
      ) : null}
    </span>
  );

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
            Puedes editar una entrada, salida o ajuste: el cambio queda en su historial con quién,
            cuándo y por qué.
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
                    <TH className="w-36">
                      <span className="sr-only">Acciones</span>
                    </TH>
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
                      <TD className="text-right">{qtyCell(m)}</TD>
                      <TD className="text-muted">{m.reason ?? '—'}</TD>
                      <TD>{actions(m)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <ul className="grid divide-y divide-line md:hidden" aria-label="Últimos movimientos">
              {movements.map((m) => (
                <li key={m.id} className="grid gap-2 px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid min-w-0 gap-0.5">
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
                    <span className="text-sm">{qtyCell(m)}</span>
                  </div>
                  {actions(m)}
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

      {editing ? (
        <EditMovementDialog
          movement={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success('Movimiento editado; el cambio quedó en su historial');
            router.refresh();
          }}
        />
      ) : null}

      {viewing ? (
        <MovementTimeline
          movement={viewing}
          onClose={() => setViewing(null)}
          onEdit={
            canEdit && viewing.editable
              ? () => {
                  setEditing(viewing);
                  setViewing(null);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function EditMovementDialog({
  movement,
  onClose,
  onSaved,
}: {
  movement: MovementRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState(String(movement.qty));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = (KIND_LABEL[movement.kind] ?? movement.kind).toLowerCase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await correctMovement({ id: movement.id, qty, reason });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo editar.');
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,30rem)] overflow-y-auto">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              Editar {label} · {movement.sku}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {formatDateTime(movement.created_at)} · {movement.warehouse}. Cantidad actual:{' '}
              <span className="tabular text-fg">{n(movement.qty)}</span>. Las existencias se
              recalculan solas.
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
            id="e-qty"
            label="Cantidad correcta *"
            hint={movement.kind === 'adjust' ? 'Negativo para restar.' : undefined}
          >
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
          <Field id="e-reason" label="Motivo del cambio *">
            {(a) => (
              <Input
                {...a}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoComplete="off"
                placeholder="Ej. se capturaron 12 en lugar de 10"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Guardar cambio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Vertical timeline: the movement as first saved, then every edit with who, when, from → to and why. */
function MovementTimeline({
  movement,
  onClose,
  onEdit,
}: {
  movement: MovementRow;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const reduce = useReducedMotion();
  const steps = [
    {
      key: movement.id,
      title: `${KIND_LABEL[movement.kind] ?? movement.kind} registrada`,
      detail: (
        <>
          Cantidad <span className="tabular text-fg">{n(movement.originalQty)}</span>
        </>
      ),
      reason: movement.reason,
      who: movement.who,
      at: movement.created_at,
      first: true,
    },
    ...movement.history.map((h) => ({
      key: h.id,
      title: 'Editado',
      detail: (
        <>
          <span className="tabular text-faint line-through">{n(h.from)}</span>
          <span aria-hidden> → </span>
          <span className="sr-only"> cambió a </span>
          <span className="tabular font-medium text-fg">{n(h.to)}</span>
        </>
      ),
      reason: h.reason,
      who: h.who,
      at: h.created_at,
      first: false,
    })),
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,30rem)] overflow-y-auto">
        <div className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              Historial · {movement.sku}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              {movement.warehouse}
              {movement.lot ? ` · lote ${movement.lot}` : ''} · cantidad vigente{' '}
              <span className="tabular text-fg">{n(movement.qty)}</span>
            </DialogDescription>
          </div>
          <ol className="relative grid gap-5 pl-7">
            <span
              aria-hidden
              className="absolute bottom-2 left-[0.6875rem] top-2 w-px bg-gradient-to-b from-gold/70 via-line to-line"
            />
            {steps.map((s, i) => (
              <motion.li
                key={s.key}
                className="relative grid gap-0.5"
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.32,
                  delay: reduce ? 0 : 0.06 + i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span
                  aria-hidden
                  className={`absolute -left-7 top-1 grid size-[1.375rem] place-items-center rounded-full border ${s.first ? 'border-gold/60 bg-gold/15 text-gold' : 'border-line-strong bg-surface-2 text-muted'}`}
                >
                  {s.first ? <Plus className="size-3" /> : <Pencil className="size-3" />}
                </span>
                <span className="text-sm font-medium text-fg">{s.title}</span>
                <span className="text-sm text-muted">{s.detail}</span>
                {s.reason ? <span className="text-sm text-muted">«{s.reason}»</span> : null}
                <span className="text-xs text-faint">
                  {formatDateTime(s.at)}
                  {s.who ? ` · ${s.who}` : ''}
                </span>
              </motion.li>
            ))}
          </ol>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            {onEdit ? (
              <Button type="button" variant="primary" onClick={onEdit}>
                <Pencil aria-hidden />
                Editar
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
