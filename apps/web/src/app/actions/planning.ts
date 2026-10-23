'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { explainDbError } from '@/lib/db-errors';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export interface PlanningResult {
  ok: boolean;
  error?: string;
}

export interface ObjectiveUpdateRow {
  id: string;
  value: number;
  note: string | null;
  created_at: string;
  author: string | null;
}

const updateSchema = z.object({
  value: z.coerce.number().min(0, 'El avance no puede ser negativo').max(1e12),
  note: z.string().trim().max(500).nullish(),
});

/** Progress is a new row, never an overwrite: the history stays, and the database moves the current value. */
export async function addObjectiveUpdate(
  objectiveId: string,
  input: unknown,
): Promise<PlanningResult> {
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  if (!z.uuid().safeParse(objectiveId).success) return { ok: false, error: 'Solicitud inválida.' };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { error } = await supabase.from('objective_updates').insert({
    objective_id: objectiveId,
    value: parsed.data.value,
    note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath('/planeacion');
  return { ok: true };
}

export async function listObjectiveUpdates(objectiveId: string): Promise<ObjectiveUpdateRow[]> {
  if (!(await getSessionUser()) || !z.uuid().safeParse(objectiveId).success) return [];
  const supabase = await createSupabase();
  const { data } = await supabase
    .from('objective_updates')
    .select('id,value,note,created_at,author:profiles!created_by(name)')
    .eq('objective_id', objectiveId)
    .order('created_at', { ascending: false })
    .limit(8);
  return (
    (data ?? []) as unknown as {
      id: string;
      value: number;
      note: string | null;
      created_at: string;
      author: { name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    value: Number(r.value),
    note: r.note,
    created_at: r.created_at,
    author: r.author?.name ?? null,
  }));
}
