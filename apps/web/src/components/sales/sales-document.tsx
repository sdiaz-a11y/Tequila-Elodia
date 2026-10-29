'use client';

import { trackingUrl } from '@/lib/tracking';
import { EmailDialog } from './email-dialog';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  ArrowLeft,
  Check,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  Send,
  Trash2,
  Truck,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addPayment,
  convertQuote,
  deleteLine,
  shipOrder,
  deletePayment,
  transitionOrder,
  transitionQuote,
} from '@/app/actions/sales';
import { saveRow } from '@/app/actions/entities';
import { EntityFormDialog } from '@/components/entities/entity-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import { ENTITIES, type Option, type RelationKey } from '@/lib/entities';
import { formatDay, formatMoney2 } from '@/lib/format';
import {
  ORDER_STATUS,
  PAY_METHODS,
  QUOTE_STATUS,
  type DocLine,
  type VariantChoice,
} from '@/lib/sales';
import { LineDialog } from './line-dialog';

export interface DocData {
  id: string;
  number: string;
  status: string;
  account: { id: string; name: string } | null;
  notes: string | null;
  valid_until?: string | null;
  quote_id?: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  paid_total?: number;
  carrier?: string | null;
  tracking?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}
export interface PaymentRow {
  id: string;
  amount: number;
  paid_on: string;
  method: string;
  reference: string | null;
}

const label = (list: readonly Option[], v: string) => list.find((o) => o.value === v)?.label ?? v;

export function SalesDocument({
  kind,
  doc,
  lines,
  variants,
  payments,
  orderId,
  relations,
  canWrite,
  canManage,
  canCollect,
  emailEnabled = false,
  defaultEmail = '',
}: {
  kind: 'quote' | 'order';
  doc: DocData;
  lines: DocLine[];
  variants: VariantChoice[];
  payments: PaymentRow[];
  /** For a quote: the order it was converted into, if any. */
  orderId: string | null;
  relations: Partial<Record<RelationKey, Option[]>>;
  canWrite: boolean;
  canManage: boolean;
  canCollect: boolean;
  /** The email provider is set up (RESEND_API_KEY). */
  emailEnabled?: boolean;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const isQuote = kind === 'quote';
  const statuses = isQuote ? QUOTE_STATUS : ORDER_STATUS;
  const st = statuses.find((s) => s.value === doc.status);
  const editable =
    canWrite &&
    (isQuote ? doc.status === 'draft' || doc.status === 'sent' : doc.status === 'pending');
  const [lineDialog, setLineDialog] = useState<{ line: DocLine | null } | null>(null);
  const [removing, setRemoving] = useState<DocLine | null>(null);
  const [editHeader, setEditHeader] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [removingPay, setRemovingPay] = useState<PaymentRow | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const refresh = () => router.refresh();
  const balance = isQuote ? 0 : Math.round((doc.total - (doc.paid_total ?? 0)) * 100) / 100;

  async function run(fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, ok: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo completar.');
    toast.success(ok);
    if (res.id) router.push(`/pedidos/${res.id}`);
    else refresh();
  }

  const quoteAction = (action: string, ok: string) =>
    run(() => transitionQuote(doc.id, action), ok);
  const orderAction = (action: string, ok: string) =>
    run(() => transitionOrder(doc.id, action), ok);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div data-no-print className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={isQuote ? '/cotizaciones' : '/pedidos'}>
            <ArrowLeft aria-hidden />
            {isQuote ? 'Cotizaciones' : 'Pedidos'}
          </Link>
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir / PDF
          </Button>
          {canWrite &&
          doc.status !== 'delivered' &&
          doc.status !== 'cancelled' &&
          !(isQuote && doc.status === 'accepted') ? (
            <Button variant="secondary" size="sm" onClick={() => setEditHeader(true)}>
              <Pencil aria-hidden />
              Editar datos
            </Button>
          ) : null}
        </div>
      </div>

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
            {doc.number}
          </h1>
          <Badge tone={st?.tone ?? 'neutral'}>{st?.label ?? doc.status}</Badge>
        </div>
        <p className="text-sm text-muted">
          {isQuote ? 'Cotización' : 'Pedido'} para{' '}
          <span className="text-fg">{doc.account?.name ?? '—'}</span>
          {isQuote && doc.valid_until ? ` · válida hasta ${formatDay(doc.valid_until)}` : ''}
          {!isQuote && doc.quote_id ? (
            <>
              {' · '}
              <Link
                href={`/cotizaciones/${doc.quote_id}`}
                className="text-gold underline-offset-4 hover:underline"
              >
                ver cotización de origen
              </Link>
            </>
          ) : null}
        </p>
        {doc.notes ? (
          <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted">{doc.notes}</p>
        ) : null}
        {!isQuote && (doc.carrier || doc.tracking || doc.shipped_at) ? (
          <p className="tabular text-sm text-muted">
            Envío{doc.carrier ? ` con ${doc.carrier}` : ''}
            {doc.tracking ? ' · guía ' : ''}
            {doc.tracking ? (
              trackingUrl(doc.carrier, doc.tracking) ? (
                <a
                  href={trackingUrl(doc.carrier, doc.tracking)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold underline-offset-4 hover:underline"
                >
                  {doc.tracking} (rastrear)
                </a>
              ) : (
                doc.tracking
              )
            ) : null}
            {doc.shipped_at ? ` · enviado el ${formatDay(doc.shipped_at)}` : ''}
            {doc.delivered_at ? ` · entregado el ${formatDay(doc.delivered_at)}` : ''}
          </p>
        ) : null}
      </header>

      {canWrite ? (
        <div data-no-print className="flex flex-wrap gap-2">
          {isQuote && emailEnabled && doc.status !== 'rejected' && lines.length ? (
            <Button variant="secondary" onClick={() => setEmailOpen(true)}>
              <Mail aria-hidden />
              Enviar por correo
            </Button>
          ) : null}
          {isQuote && doc.status === 'draft' ? (
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void quoteAction('send', 'Cotización enviada')}
            >
              <Send aria-hidden />
              Marcar como enviada
            </Button>
          ) : null}
          {isQuote && doc.status === 'sent' ? (
            <>
              <Button
                variant="primary"
                loading={busy}
                onClick={() => void quoteAction('accept', 'Cotización aceptada')}
              >
                <Check aria-hidden />
                Fue aceptada
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={() => void quoteAction('reject', 'Cotización rechazada')}
              >
                <X aria-hidden />
                Fue rechazada
              </Button>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void quoteAction('reopen', 'Devuelta a borrador')}
              >
                <Undo2 aria-hidden />
                Volver a borrador
              </Button>
            </>
          ) : null}
          {isQuote && doc.status === 'rejected' ? (
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => void quoteAction('reopen', 'Devuelta a borrador')}
            >
              <Undo2 aria-hidden />
              Reabrir como borrador
            </Button>
          ) : null}
          {isQuote && doc.status === 'accepted' ? (
            orderId ? (
              <Button asChild variant="primary">
                <Link href={`/pedidos/${orderId}`}>
                  <PackageCheck aria-hidden />
                  Ver el pedido
                </Link>
              </Button>
            ) : (
              <Button
                variant="primary"
                loading={busy}
                onClick={() => void run(() => convertQuote(doc.id), 'Pedido creado')}
              >
                <PackageCheck aria-hidden />
                Convertir en pedido
              </Button>
            )
          ) : null}
          {!isQuote && doc.status === 'pending' ? (
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void orderAction('confirm', 'Pedido confirmado')}
            >
              <Check aria-hidden />
              Confirmar pedido
            </Button>
          ) : null}
          {!isQuote && doc.status === 'confirmed' ? (
            <Button variant="primary" loading={busy} onClick={() => setShipOpen(true)}>
              <Truck aria-hidden />
              Marcar como enviado
            </Button>
          ) : null}
          {!isQuote && doc.status === 'shipped' ? (
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void orderAction('deliver', 'Pedido entregado')}
            >
              <PackageCheck aria-hidden />
              Marcar como entregado
            </Button>
          ) : null}
          {!isQuote && (doc.status === 'pending' || doc.status === 'confirmed') ? (
            <Button
              variant="ghost"
              className="text-danger hover:text-danger"
              onClick={() => setConfirmCancel(true)}
            >
              <X aria-hidden />
              Cancelar pedido
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3 pb-4">
          <div className="grid gap-1">
            <CardTitle>Líneas</CardTitle>
            <CardDescription>
              Cada línea conserva el precio, descuento e impuesto con los que se capturó.
            </CardDescription>
          </div>
          {editable ? (
            <Button
              data-no-print
              variant="primary"
              size="sm"
              onClick={() => setLineDialog({ line: null })}
            >
              <Plus aria-hidden />
              Agregar línea
            </Button>
          ) : null}
        </CardHeader>
        {lines.length === 0 ? (
          <EmptyState
            title="Sin líneas"
            description={
              editable
                ? 'Agrega el primer producto con su cantidad y precio.'
                : 'Este documento no tiene líneas.'
            }
            className="py-10"
          />
        ) : (
          <>
            <TableWrap className="hidden md:block">
              <Table aria-label="Líneas del documento">
                <THead>
                  <tr>
                    <TH>Descripción</TH>
                    <TH className="text-right">Cant.</TH>
                    <TH className="text-right">Precio</TH>
                    <TH className="text-right">Desc.</TH>
                    <TH className="text-right">IVA</TH>
                    <TH className="text-right">Importe</TH>
                    {editable ? (
                      <TH className="w-24" data-no-print>
                        <span className="sr-only">Acciones</span>
                      </TH>
                    ) : null}
                  </tr>
                </THead>
                <tbody>
                  {lines.map((l) => (
                    <TR key={l.id}>
                      <TD className="min-w-48">{l.description}</TD>
                      <TD className="tabular text-right text-muted">{l.quantity}</TD>
                      <TD className="tabular text-right text-muted">
                        {formatMoney2(l.unit_price)}
                      </TD>
                      <TD className="tabular text-right text-muted">
                        {l.discount_pct ? `${l.discount_pct} %` : '—'}
                      </TD>
                      <TD className="tabular text-right text-muted">{l.tax_rate} %</TD>
                      <TD className="tabular text-right font-medium">
                        {formatMoney2(l.line_total)}
                      </TD>
                      {editable ? (
                        <TD data-no-print>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar ${l.description}`}
                              onClick={() => setLineDialog({ line: l })}
                            >
                              <Pencil aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Quitar ${l.description}`}
                              onClick={() => setRemoving(l)}
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          </div>
                        </TD>
                      ) : null}
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <ul className="grid divide-y divide-line md:hidden" aria-label="Líneas del documento">
              {lines.map((l) => (
                <li key={l.id} className="grid gap-2 px-5 py-4">
                  <p className="text-sm font-medium text-fg">{l.description}</p>
                  <p className="tabular text-[0.8125rem] text-muted">
                    {l.quantity} × {formatMoney2(l.unit_price)}
                    {l.discount_pct ? ` · desc. ${l.discount_pct} %` : ''} · IVA {l.tax_rate} %
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="tabular text-base font-semibold text-fg">
                      {formatMoney2(l.line_total)}
                    </span>
                    {editable ? (
                      <span data-no-print className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${l.description}`}
                          onClick={() => setLineDialog({ line: l })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar ${l.description}`}
                          onClick={() => setRemoving(l)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <dl className="tabular ml-auto grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-1.5 border-t border-line p-5 text-sm">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-right">{formatMoney2(doc.subtotal)}</dd>
          <dt className="text-muted">Descuento</dt>
          <dd className="text-right">
            {doc.discount_total ? `− ${formatMoney2(doc.discount_total)}` : formatMoney2(0)}
          </dd>
          <dt className="text-muted">IVA</dt>
          <dd className="text-right">{formatMoney2(doc.tax_total)}</dd>
          <dt className="pt-1 text-base font-medium text-fg">Total</dt>
          <dd className="pt-1 text-right text-base font-semibold text-gold">
            {formatMoney2(doc.total)}
          </dd>
          {!isQuote ? (
            <>
              <dt className="text-muted">Pagado</dt>
              <dd className="text-right">{formatMoney2(doc.paid_total ?? 0)}</dd>
              <dt className="font-medium text-fg">Saldo pendiente</dt>
              <dd
                className={`text-right font-medium ${balance > 0 ? 'text-warning' : 'text-success'}`}
              >
                {formatMoney2(balance)}
              </dd>
            </>
          ) : null}
        </dl>
      </Card>

      {!isQuote && canCollect ? (
        <Card className="overflow-hidden" data-no-print>
          <CardHeader className="flex-row items-start justify-between gap-3 pb-4">
            <div className="grid gap-1">
              <CardTitle>Pagos</CardTitle>
              <CardDescription>
                Solo se registran pagos de pedidos confirmados y nunca más que el saldo.
              </CardDescription>
            </div>
            {doc.status !== 'cancelled' && doc.status !== 'pending' && balance > 0 ? (
              <Button variant="primary" size="sm" onClick={() => setPayOpen(true)}>
                <Plus aria-hidden />
                Registrar pago
              </Button>
            ) : null}
          </CardHeader>
          {payments.length === 0 ? (
            <EmptyState
              title="Sin pagos"
              description="Aquí aparecerán los pagos recibidos de este pedido."
              className="py-8"
            />
          ) : (
            <>
              <TableWrap className="hidden md:block">
                <Table aria-label="Pagos">
                  <THead>
                    <tr>
                      <TH>Fecha</TH>
                      <TH>Método</TH>
                      <TH>Referencia</TH>
                      <TH className="text-right">Monto</TH>
                      <TH className="w-12">
                        <span className="sr-only">Acciones</span>
                      </TH>
                    </tr>
                  </THead>
                  <tbody>
                    {payments.map((p) => (
                      <TR key={p.id}>
                        <TD className="tabular whitespace-nowrap">{formatDay(p.paid_on)}</TD>
                        <TD className="text-muted">{label(PAY_METHODS, p.method)}</TD>
                        <TD className="text-muted">{p.reference ?? '—'}</TD>
                        <TD className="tabular text-right font-medium">{formatMoney2(p.amount)}</TD>
                        <TD>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar pago"
                            onClick={() => setRemovingPay(p)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <ul className="grid divide-y divide-line md:hidden" aria-label="Pagos">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="grid gap-0.5">
                      <span className="tabular text-base font-semibold text-fg">
                        {formatMoney2(p.amount)}
                      </span>
                      <span className="text-[0.8125rem] text-muted">
                        {formatDay(p.paid_on)} · {label(PAY_METHODS, p.method)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar pago"
                      onClick={() => setRemovingPay(p)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      ) : null}

      {lineDialog ? (
        <LineDialog
          kind={kind}
          docId={doc.id}
          line={lineDialog.line}
          variants={variants}
          canManage={canManage}
          onClose={() => setLineDialog(null)}
          onSaved={() => {
            setLineDialog(null);
            toast.success('Línea guardada');
            refresh();
          }}
        />
      ) : null}

      {editHeader ? (
        <EntityFormDialog
          def={ENTITIES[isQuote ? 'quotes' : 'orders']}
          row={
            { ...doc, account_id: doc.account?.id ?? null } as unknown as Record<string, unknown>
          }
          open
          relations={relations}
          onClose={() => setEditHeader(false)}
          onSaved={() => {
            setEditHeader(false);
            toast.success('Guardado');
            refresh();
          }}
          save={(id, values) => saveRow(isQuote ? 'quotes' : 'orders', id, values)}
        />
      ) : null}

      <EmailDialog
        key={String(emailOpen)}

        open={emailOpen}

        quoteId={doc.id}

        number={doc.number}

        defaultTo={defaultEmail}

        onClose={() => setEmailOpen(false)}

        onSent={() => {
          setEmailOpen(false);

          refresh();
        }}
      />

      <ShipDialog
        open={shipOpen}
        orderId={doc.id}
        onClose={() => setShipOpen(false)}
        onSaved={() => {
          setShipOpen(false);
          toast.success('Pedido enviado');
          refresh();
        }}
      />

      <PaymentDialog
        open={payOpen}
        orderId={doc.id}
        max={balance}
        onClose={() => setPayOpen(false)}
        onSaved={() => {
          setPayOpen(false);
          toast.success('Pago registrado');
          refresh();
        }}
      />

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent
          title="¿Quitar esta línea?"
          description="El total del documento se recalcula."
          confirmLabel="Quitar"
          loading={busy}
          onConfirm={() => {
            const l = removing;
            setRemoving(null);
            if (l) void run(() => deleteLine(kind, doc.id, l.id), 'Línea eliminada');
          }}
        />
      </AlertDialog>
      <AlertDialog open={removingPay !== null} onOpenChange={(o) => !o && setRemovingPay(null)}>
        <AlertDialogContent
          title="¿Eliminar este pago?"
          description="El saldo del pedido vuelve a subir. Queda registrado en la auditoría."
          confirmLabel="Eliminar"
          loading={busy}
          onConfirm={() => {
            const p = removingPay;
            setRemovingPay(null);
            if (p) void run(() => deletePayment(doc.id, p.id), 'Pago eliminado');
          }}
        />
      </AlertDialog>
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent
          title="¿Cancelar este pedido?"
          description="No se puede reactivar. Si ya tiene pagos, primero hay que eliminarlos."
          confirmLabel="Cancelar pedido"
          loading={busy}
          onConfirm={() => {
            setConfirmCancel(false);
            void orderAction('cancel', 'Pedido cancelado');
          }}
        />
      </AlertDialog>
    </div>
  );
}

function PaymentDialog({
  open,
  orderId,
  max,
  onClose,
  onSaved,
}: {
  open: boolean;
  orderId: string;
  max: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('transfer');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await addPayment(orderId, {
      amount,
      paid_on: paidOn,
      method,
      reference: reference || null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo registrar.');
    setAmount('');
    setReference('');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="w-[min(94vw,28rem)]">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">Registrar pago</DialogTitle>
            <DialogDescription className="text-sm text-muted">
              Saldo pendiente: {formatMoney2(max)}
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
          <Field id="p-amount" label="Monto (MXN) *">
            {(a) => (
              <Input
                {...a}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            )}
          </Field>
          <Field id="p-date" label="Fecha *">
            {(a) => (
              <Input
                {...a}
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            )}
          </Field>
          <Field id="p-method" label="Método *">
            {(a) => (
              <Select {...a} value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAY_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="p-ref" label="Referencia">
            {(a) => (
              <Input
                {...a}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Registrar pago
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShipDialog({
  open,
  orderId,
  onClose,
  onSaved,
}: {
  open: boolean;
  orderId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await shipOrder(orderId, { carrier: carrier || null, tracking: tracking || null });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? 'No se pudo marcar como enviado.');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="w-[min(94vw,28rem)]">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5 p-6">
          <div className="grid gap-1">
            <DialogTitle className="text-base font-semibold text-fg">
              Marcar como enviado
            </DialogTitle>
            <DialogDescription className="text-sm text-muted">
              Si el inventario automático está activo, las existencias apartadas salen del almacén.
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
          <Field id="s-carrier" label="Paquetería o transporte">
            {(a) => (
              <Input
                {...a}
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <Field id="s-tracking" label="Número de guía">
            {(a) => (
              <Input
                {...a}
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Marcar como enviado
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
