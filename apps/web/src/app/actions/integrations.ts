'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { explainDbError } from '@/lib/db-errors';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

/** Creates or replaces the person's private calendar link; the previous one stops working at once. */
export async function rotateCalendarToken(): Promise<{
  ok: boolean;
  token?: string;
  error?: string;
}> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const token = randomBytes(32).toString('base64url');
  const supabase = await createSupabase();
  const { error } = await supabase
    .from('calendar_tokens')
    .upsert({ user_id: user.id, token, created_at: new Date().toISOString() });
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath('/integraciones');
  return { ok: true, token };
}

export async function revokeCalendarToken(): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const supabase = await createSupabase();
  const { error } = await supabase.from('calendar_tokens').delete().eq('user_id', user.id);
  if (error) return { ok: false, error: explainDbError(error) };
  revalidatePath('/integraciones');
  return { ok: true };
}
