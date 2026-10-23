'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ROLE_KEYS } from '@elodia/shared';
import { canAdmin } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createAdminSupabase, createSupabase } from '@/lib/supabase/server';

export interface TeamResult {
  ok: boolean;
  error?: string;
  /** Shown once, never stored. */
  temporaryPassword?: string;
}

/** Roles only people who already hold them (or the technical owner) may hand out. */
const ELEVATED = ['tech_superadmin', 'director_vp'];

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function temporaryPassword(): string {
  const group = () =>
    Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${group()}-${group()}-${group()}`;
}

async function requireAdmin() {
  const user = await getSessionUser();
  return user && canAdmin(user) ? user : null;
}

const mayAssign = (actorRoles: string[], role: string) =>
  !ELEVATED.includes(role) || actorRoles.includes('tech_superadmin') || actorRoles.includes(role);

const createSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  name: z.string().trim().min(2, 'Escribe el nombre completo').max(120),
  role: z.enum(ROLE_KEYS),
});

export async function createUser(input: unknown): Promise<TeamResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: 'No tienes permiso para administrar el equipo.' };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const { email, name, role } = parsed.data;
  if (!mayAssign(actor.roles, role))
    return { ok: false, error: 'No puedes asignar un rol con más poder que el tuyo.' };

  const password = temporaryPassword();
  const admin = createAdminSupabase();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    // app_metadata can only be written with the secret key, so a person can never grant themselves a role.
    app_metadata: { role },
  });
  if (error) {
    return {
      ok: false,
      error: /already|registered|exists/i.test(error.message)
        ? 'Ya existe un usuario con ese correo.'
        : 'No se pudo crear el usuario. Inténtalo de nuevo.',
    };
  }
  // Auth stores app_metadata after inserting the user, so the profile trigger starts at the no-access
  // default; set the real role explicitly (secret key bypasses RLS, server only).
  const { error: roleError } = await admin
    .from('profiles')
    .update({ role, name })
    .eq('id', created.user.id);
  if (roleError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: 'No se pudo asignar el rol. Inténtalo de nuevo.' };
  }
  revalidatePath('/equipo');
  return { ok: true, temporaryPassword: password };
}

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ROLE_KEYS).optional(),
  active: z.boolean().optional(),
});

export async function updateUser(input: unknown): Promise<TeamResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: 'No tienes permiso para administrar el equipo.' };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos.' };
  const { id, ...changes } = parsed.data;
  if (id === actor.id && (changes.role !== undefined || changes.active !== undefined))
    return { ok: false, error: 'No puedes cambiar tu propio rol ni tu estado.' };
  if (changes.role && !mayAssign(actor.roles, changes.role))
    return { ok: false, error: 'No puedes asignar un rol con más poder que el tuyo.' };

  const supabase = await createSupabase();
  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Usuario no encontrado.' };
  if (!mayAssign(actor.roles, target.role))
    return { ok: false, error: 'No puedes modificar a alguien con más poder que tú.' };

  const { data, error } = await supabase.from('profiles').update(changes).eq('id', id).select('id');
  if (error || !data?.length) return { ok: false, error: 'No se pudo guardar el cambio.' };
  // The role also lives in Auth metadata (the source for new sessions' provisioning); keep both in sync.
  if (changes.role)
    await createAdminSupabase().auth.admin.updateUserById(id, {
      app_metadata: { role: changes.role },
    });
  revalidatePath('/equipo');
  return { ok: true };
}

export async function resetUserPassword(id: string): Promise<TeamResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: 'No tienes permiso para administrar el equipo.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Datos inválidos.' };
  if (id === actor.id)
    return { ok: false, error: 'Para tu propia cuenta usa «Cambiar contraseña».' };
  const supabase = await createSupabase();
  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .maybeSingle();
  if (!target) return { ok: false, error: 'Usuario no encontrado.' };
  if (!mayAssign(actor.roles, target.role))
    return { ok: false, error: 'No puedes modificar a alguien con más poder que tú.' };

  const password = temporaryPassword();
  const admin = createAdminSupabase();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { ok: false, error: 'No se pudo restablecer la contraseña.' };
  await admin.auth.admin.signOut(id, 'global').catch(() => undefined);
  return { ok: true, temporaryPassword: password };
}
