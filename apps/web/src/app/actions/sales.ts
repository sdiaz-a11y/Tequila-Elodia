'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { explainDbError } from '@/lib/db-errors';
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
