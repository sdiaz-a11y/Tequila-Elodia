'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { explainDbError } from '@/lib/db-errors';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export interface InventoryResult {
  ok: boolean;
  error?: string;
}

const movementSchema = z
  .object({
    variant_id: z.uuid('Elige una presentación'),
    warehouse_id: z.uuid('Elige un almacén'),
    lot_id: z.uuid().nullish(),
    kind: z.enum(['in', 'out', 'adjust']),
    qty: z.coerce.number().min(-1e7).max(1e7),
    reason: z.string().trim().max(300).nullish(),
  })
  .refine((v) => v.qty !== 0, { path: ['qty'], message: 'La cantidad no puede ser 0' })
  .refine((v) => v.kind === 'adjust' || v.qty > 0, {
    path: ['qty'],
    message: 'Para entradas y salidas usa una cantidad positiva',
  })
  .refine((v) => v.kind !== 'adjust' || (v.reason ?? '').length >= 3, {
    path: ['reason'],
    message: 'Explica el motivo del ajuste',
  });

/**
 * The ledger only grows: a correction is a new "adjust" movement with a reason. The database refuses
 * negative stock and taking out what is already reserved for an order.
 */
export async function recordMovement(input: unknown): Promise<InventoryResult> {
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { error } = await supabase.from('inventory_movements').insert({
    ...parsed.data,
    lot_id: parsed.data.lot_id ?? null,
    reason: parsed.data.reason || null,
  });
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath('/inventario');
  return { ok: true };
}

export async function setAutomation(key: string, enabled: boolean): Promise<InventoryResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const parsed = z
    .object({ key: z.string().min(1).max(60), enabled: z.boolean() })
    .safeParse({ key, enabled });
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('automation_settings')
    .update({
      enabled: parsed.data.enabled,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', parsed.data.key)
    .select('key');
  if (error) return { ok: false, error: explainDbError(error) };
  if (!data?.length)
    return { ok: false, error: 'No tienes permiso para cambiar las automatizaciones.' };
  revalidatePath('/automatizaciones');
  return { ok: true };
}
