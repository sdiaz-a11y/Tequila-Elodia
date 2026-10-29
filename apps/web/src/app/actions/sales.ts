'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { explainDbError } from '@/lib/db-errors';
import { emailConfigured, sendEmail } from '@/lib/email';
import { quoteEmailHtml } from '@/lib/quote-email';
import { canWrite } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export interface SalesResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const kindSchema = z.enum(['quote', 'order']);
const CONFIG = {
  quote: { items: 'quote_items', fk: 'quote_id', parent: 'quotes', path: '/cotizaciones' },
  order: { items: 'order_items', fk: 'order_id', parent: 'orders', path: '/pedidos' },
} as const;

async function guard(): Promise<SalesResult | null> {
  return (await getSessionUser())
    ? null
    : { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
}

const lineSchema = z.object({
  variant_id: z.uuid().nullable(),
  description: z.string().trim().min(1, 'Escribe una descripción').max(300),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor a 0').max(1e7),
  unit_price: z.coerce.number().min(0, 'El precio no puede ser negativo').max(1e9),
  discount_pct: z.coerce.number().min(0).max(100, 'El descuento va de 0 a 100'),
  tax_rate: z.coerce.number().min(0).max(100, 'El impuesto va de 0 a 100'),
});

/**
 * Saves a line with the price, discount and tax of this moment (a snapshot). The database decides whether
 * the document is still editable and whether this user may discount or change the list price.
 */
export async function saveLine(
  kind: string,
  docId: string,
  lineId: string | null,
  input: unknown,
): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  const k = kindSchema.safeParse(kind);
  if (
    !k.success ||
    !z.uuid().safeParse(docId).success ||
    (lineId && !z.uuid().safeParse(lineId).success)
  )
    return { ok: false, error: 'Solicitud inválida.' };
  const parsed = lineSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const c = CONFIG[k.data];
  const supabase = await createSupabase();
  const res = lineId
    ? await supabase.from(c.items).update(parsed.data).eq('id', lineId).select('id')
    : await supabase
        .from(c.items)
        .insert({ ...parsed.data, [c.fk]: docId })
        .select('id');
  if (res.error) return { ok: false, error: explainDbError(res.error) };
  if (!res.data?.length) return { ok: false, error: 'No tienes permiso o la línea ya no existe.' };
  revalidatePath(`${c.path}/${docId}`);
  return { ok: true };
}

export async function deleteLine(
  kind: string,
  docId: string,
  lineId: string,
): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  const k = kindSchema.safeParse(kind);
  if (!k.success || !z.uuid().safeParse(lineId).success)
    return { ok: false, error: 'Solicitud inválida.' };
  const c = CONFIG[k.data];
  const supabase = await createSupabase();
  const { data, error } = await supabase.from(c.items).delete().eq('id', lineId).select('id');
  if (error) return { ok: false, error: explainDbError(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o la línea ya no existe.' };
  revalidatePath(`${c.path}/${docId}`);
  return { ok: true };
}

const QUOTE_ACTIONS = {
  send: 'sent',
  accept: 'accepted',
  reject: 'rejected',
  reopen: 'draft',
} as const;
const ORDER_ACTIONS = {
  confirm: 'confirmed',
  ship: 'shipped',
  deliver: 'delivered',
  cancel: 'cancelled',
} as const;

export async function transitionQuote(id: string, action: string): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = z
    .object({ id: z.uuid(), action: z.enum(['send', 'accept', 'reject', 'reopen']) })
    .safeParse({ id, action });
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: QUOTE_ACTIONS[parsed.data.action] })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explainDbError(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o la cotización ya no existe.' };
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath('/cotizaciones');
  return { ok: true };
}

export async function transitionOrder(id: string, action: string): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = z
    .object({ id: z.uuid(), action: z.enum(['confirm', 'ship', 'deliver', 'cancel']) })
    .safeParse({ id, action });
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('orders')
    .update({ status: ORDER_ACTIONS[parsed.data.action] })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explainDbError(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o el pedido ya no existe.' };
  revalidatePath(`/pedidos/${id}`);
  revalidatePath('/pedidos');
  return { ok: true };
}

/** One transaction in the database: the order and all its lines exist together, or not at all, and only once. */
export async function convertQuote(id: string): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase.rpc('convert_quote_to_order', { p_quote: id });
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath('/pedidos');
  revalidatePath(`/cotizaciones/${id}`);
  return { ok: true, id: data as string };
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0').max(1e9),
  paid_on: z.iso.date('Fecha inválida'),
  method: z.enum(['transfer', 'cash', 'card', 'check', 'other']),
  reference: z.string().trim().max(120).nullish(),
});

export async function addPayment(orderId: string, input: unknown): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: 'Solicitud inválida.' };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { error } = await supabase.from('payments').insert({ ...parsed.data, order_id: orderId });
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

export async function deletePayment(orderId: string, paymentId: string): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!z.uuid().safeParse(paymentId).success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase.from('payments').delete().eq('id', paymentId).select('id');
  if (error) return { ok: false, error: explainDbError(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o el pago ya no existe.' };
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

const shipSchema = z.object({
  carrier: z.string().trim().max(80).nullish(),
  tracking: z.string().trim().max(120).nullish(),
});

/** Marks the order as shipped and records who carries it. The inventory movement is done by the database. */
export async function shipOrder(id: string, input: unknown): Promise<SalesResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Solicitud inválida.' };
  const parsed = shipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'shipped',
      carrier: parsed.data.carrier || null,
      tracking: parsed.data.tracking || null,
    })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explainDbError(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o el pedido ya no existe.' };
  revalidatePath(`/pedidos/${id}`);
  revalidatePath('/pedidos');
  revalidatePath('/inventario');
  return { ok: true };
}

const emailSchema = z.object({
  to: z.email('Escribe un correo válido').max(200),
  message: z.string().trim().max(1000).optional(),
});

/** Emails the quote to the customer and leaves a record in the company's activity. Needs the email provider set up. */
export async function sendQuoteEmail(id: string, input: unknown): Promise<SalesResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  if (!canWrite(user)) return { ok: false, error: 'No tienes permiso para enviar cotizaciones.' };
  if (!emailConfigured())
    return { ok: false, error: 'El envío de correo aún no está configurado.' };
  const parsed = emailSchema.safeParse(input);
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return {
      ok: false,
      error: parsed.success ? 'Solicitud inválida.' : parsed.error.issues[0]!.message,
    };

  const supabase = await createSupabase();
  const [quote, items] = await Promise.all([
    supabase
      .from('quotes')
      .select(
        'number,status,valid_until,currency,subtotal,discount_total,tax_total,total,notes,account_id,account:accounts!account_id(name)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('quote_items')
      .select('description,quantity,unit_price,discount_pct,line_total')
      .eq('quote_id', id)
      .order('created_at'),
  ]);
  const q = quote.data as unknown as {
    number: string;
    status: string;
    valid_until: string | null;
    currency: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    total: number;
    notes: string | null;
    account_id: string;
    account: { name: string } | null;
  } | null;
  if (!q) return { ok: false, error: 'No se encontró la cotización.' };
  if (q.status === 'rejected')
    return { ok: false, error: 'Esta cotización fue rechazada. Reábrela antes de enviarla.' };
  if (!items.data?.length)
    return { ok: false, error: 'Agrega al menos un concepto antes de enviarla.' };

  const sent = await sendEmail({
    to: parsed.data.to,
    subject: `Cotización ${q.number} · ELODIA`,
    replyTo: user.email,
    html: quoteEmailHtml(
      {
        number: q.number,
        accountName: q.account?.name ?? '',
        validUntil: q.valid_until,
        currency: q.currency,
        subtotal: Number(q.subtotal),
        discount_total: Number(q.discount_total),
        tax_total: Number(q.tax_total),
        total: Number(q.total),
        notes: q.notes,
        lines: items.data.map((l) => ({
          description: l.description as string,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_pct: Number(l.discount_pct),
          line_total: Number(l.line_total),
        })),
      },
      parsed.data.message ?? '',
    ),
  });
  if (!sent.ok) return { ok: false, error: sent.error };

  await supabase.from('activities').insert({
    kind: 'email',
    subject: `Cotización ${q.number} enviada por correo a ${parsed.data.to}`,
    account_id: q.account_id,
    done_at: new Date().toISOString(),
  });
  revalidatePath('/actividades');
  return { ok: true };
}
