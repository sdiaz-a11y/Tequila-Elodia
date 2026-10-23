'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabase } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(128),
});

/** One generic message for every failure: wrong password, unknown user and disabled user look the same. */
export async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa el correo y la contraseña.' };
  const supabase = await createSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      error:
        error.status === 429
          ? 'Demasiados intentos. Espera unos minutos.'
          : 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.',
    };
  }
  // Authenticated in Auth but without an active profile (disabled, or never provisioned): no access.
  if (!(await getSessionUser())) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: 'Tu cuenta no tiene acceso. Pide a un administrador que la active.',
    };
  }
  return { ok: true };
}

export async function logout(): Promise<void> {
  const supabase = await createSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12, 'Usa al menos 12 caracteres').max(128),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
  });

/** Re-checks the current password first, so a stolen session alone cannot take over the account. */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const supabase = await createSupabase();
  const check = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (check.error) return { ok: false, error: 'La contraseña actual no es correcta' };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error)
    return { ok: false, error: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' };
  return { ok: true };
}
