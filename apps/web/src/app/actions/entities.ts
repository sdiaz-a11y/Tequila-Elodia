'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ENTITIES, isEntityKey, localToIso, schemaFor } from '@/lib/entities';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export interface SaveResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Permissions live in the database (Row Level Security). These messages only translate its answers;
 * a denied write can never succeed no matter what the browser sends.
 */
function explain(error: { code?: string; message: string }): string {
  if (error.code === '42501') return 'No tienes permiso para esta acción.';
  if (error.code === '23505') return 'Ya existe un registro con esos datos.';
  if (error.code === '23503') return 'Este registro está ligado a otros y no se puede quitar así.';
  if (error.code === '23514') return 'Alguno de los valores no es válido.';
  if (error.code === 'P0001') return error.message;
  return 'No se pudo guardar. Inténtalo de nuevo.';
}

const paths: Record<string, string[]> = {
  accounts: ['/empresas', '/'],
  contacts: ['/contactos'],
  opportunities: ['/pipeline', '/'],
  activities: ['/actividades', '/'],
  territories: ['/territorios'],
  distributors: ['/distribuidores', '/'],
  content_items: ['/calendario', '/aprobaciones'],
};

export async function saveRow(key: string, id: string | null, input: unknown): Promise<SaveResult> {
  if (!isEntityKey(key)) return { ok: false, error: 'Recurso desconocido.' };
  const def = ENTITIES[key];
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };

  const parsed = schemaFor(def, id ? 'edit' : 'create').safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0] ?? '')] ??= issue.message;
    return { ok: false, error: 'Revisa los campos marcados.', fieldErrors };
  }
  const values: Record<string, unknown> = { ...parsed.data };
  for (const f of def.fields)
    if (f.type === 'datetime' && f.name in values)
      values[f.name] = localToIso(values[f.name] as string | null);

  const supabase = await createSupabase();
  const res = id
    ? await supabase.from(def.table).update(values).eq('id', id).select('id')
    : await supabase.from(def.table).insert(values).select('id');
  if (res.error) return { ok: false, error: explain(res.error) };
  // RLS hides rows you cannot touch: an update that matched nothing means "no permission or gone".
  if (!res.data?.length)
    return { ok: false, error: 'No tienes permiso o el registro ya no existe.' };

  // A distributor is a company marked as such: keep both in sync without duplicating the company.
  if (key === 'distributors' && typeof values.account_id === 'string')
    await supabase.from('accounts').update({ type: 'distributor' }).eq('id', values.account_id);

  for (const p of paths[key] ?? []) revalidatePath(p);
  return { ok: true };
}

export async function deleteRow(key: string, id: string): Promise<SaveResult> {
  if (!isEntityKey(key) || !z.uuid().safeParse(id).success)
    return { ok: false, error: 'Solicitud inválida.' };
  const def = ENTITIES[key];
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const supabase = await createSupabase();
  const res = def.softDelete
    ? await supabase
        .from(def.table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
    : await supabase.from(def.table).delete().eq('id', id).select('id');
  if (res.error) return { ok: false, error: explain(res.error) };
  if (!res.data?.length) return { ok: false, error: 'No tienes permiso para eliminar esto.' };
  for (const p of paths[key] ?? []) revalidatePath(p);
  return { ok: true };
}

export async function moveOpportunity(id: string, stageId: string): Promise<SaveResult> {
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(stageId).success)
    return { ok: false, error: 'Solicitud inválida.' };
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('opportunities')
    .update({ stage_id: stageId })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso para mover esta oportunidad.' };
  revalidatePath('/pipeline');
  revalidatePath('/');
  return { ok: true };
}

export async function setActivityDone(id: string, done: boolean): Promise<SaveResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Solicitud inválida.' };
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('activities')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso para cambiar esta actividad.' };
  revalidatePath('/actividades');
  revalidatePath('/');
  return { ok: true };
}
