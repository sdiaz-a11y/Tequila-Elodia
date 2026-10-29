'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { explainDbError } from '@/lib/db-errors';
import { CAPABILITIES } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

const schema = z.object({
  role: z.string().min(1).max(40),
  capability: z.enum(CAPABILITIES),
  enabled: z.boolean(),
});

/** The database checks who may do this (superadmin and director, intermediate roles only); this is just the doorway. */
export async function setRoleCapability(input: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!(await getSessionUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { error } = await supabase.rpc('set_role_capability', {
    p_role: parsed.data.role,
    p_cap: parsed.data.capability,
    p_enabled: parsed.data.enabled,
  });
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath('/roles');
  return { ok: true };
}
