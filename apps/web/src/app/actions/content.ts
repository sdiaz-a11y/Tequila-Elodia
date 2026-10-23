'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES } from '@/lib/content';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export interface ContentResult {
  ok: boolean;
  error?: string;
}

/**
 * The database enforces the rules (who may approve, no approval without the legal check…) and answers with
 * readable Spanish messages for those; anything else is reduced to a generic text.
 */
function explain(error: { code?: string; message: string }): string {
  if (error.code === '42501' || error.code === '23514') {
    // Our own trigger messages are in Spanish; RLS denials are not.
    return /^[a-záéíóúñ¿]/i.test(error.message) &&
      !/row-level security|permission denied/i.test(error.message)
      ? error.message
      : 'No tienes permiso para esta acción.';
  }
  if (error.code === '23505') return 'Ya existe un registro con esos datos.';
  return 'No se pudo completar la acción. Inténtalo de nuevo.';
}

async function requireUser() {
  return getSessionUser();
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (usa #RRGGBB)');
const brandKitSchema = z.object({
  tone: z.string().trim().max(4000),
  approved_messages: z.string().trim().max(8000),
  restrictions: z.string().trim().max(4000),
  palette: z.array(z.object({ name: z.string().trim().min(1).max(60), hex })).max(24),
  fonts: z
    .array(z.object({ name: z.string().trim().min(1).max(120), usage: z.string().trim().max(400) }))
    .max(12),
});

export async function saveBrandKit(input: unknown): Promise<ContentResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('brand_kit')
    .update({ ...parsed.data, updated_by: user.id })
    .eq('id', 1)
    .select('id');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso para editar el Brand Kit.' };
  revalidatePath('/brand-kit');
  return { ok: true };
}

const assetSchema = z.object({
  title: z.string().trim().min(1, 'Escribe un título').max(160),
  kind: z.enum(['logo', 'photo', 'product', 'video', 'reference', 'document', 'other']),
  description: z.string().trim().max(1000).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  official: z.boolean().default(false),
});

const registerSchema = assetSchema.extend({
  // Files are uploaded by the browser straight to Storage under uploads/; this only records them.
  storage_path: z
    .string()
    .regex(/^uploads\/[0-9a-f-]{36}-[\w.-]{1,120}$/, 'Ruta de archivo inválida'),
  mime: z.enum(ACCEPTED_MIME as [string, ...string[]]),
  size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export async function registerAsset(input: unknown): Promise<ContentResult> {
  if (!(await requireUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { error } = await supabase.from('brand_assets').insert(parsed.data);
  if (error) {
    // Do not leave an orphan file behind when the record is refused.
    await supabase.storage.from('brand').remove([parsed.data.storage_path]);
    return { ok: false, error: explain(error) };
  }
  revalidatePath('/biblioteca');
  revalidatePath('/brand-kit');
  return { ok: true };
}

export async function updateAsset(id: string, input: unknown): Promise<ContentResult> {
  if (!(await requireUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Solicitud inválida.' };
  const parsed = assetSchema.partial().safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('brand_assets')
    .update(parsed.data)
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso para modificar este archivo.' };
  revalidatePath('/biblioteca');
  revalidatePath('/brand-kit');
  return { ok: true };
}

export async function deleteAsset(id: string): Promise<ContentResult> {
  if (!(await requireUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Solicitud inválida.' };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('brand_assets')
    .delete()
    .eq('id', id)
    .select('storage_path');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length)
    return {
      ok: false,
      error:
        'No tienes permiso para eliminar este archivo (los oficiales solo los quita dirección).',
    };
  await supabase.storage.from('brand').remove([data[0]!.storage_path]);
  revalidatePath('/biblioteca');
  revalidatePath('/brand-kit');
  return { ok: true };
}

const transitionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('submit') }),
  z.object({ action: z.literal('reopen') }),
  z.object({ action: z.literal('publish') }),
  z.object({
    action: z.literal('approve'),
    legalChecked: z.literal(true, {
      error: 'Confirma la revisión de la normativa antes de aprobar.',
    }),
    comment: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal('reject'),
    comment: z.string().trim().min(3, 'Explica el motivo del rechazo.').max(1000),
  }),
]);

/** One entry point for the editorial workflow. The database trigger is the final judge of every transition. */
export async function transitionContent(id: string, input: unknown): Promise<ContentResult> {
  if (!(await requireUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Solicitud inválida.' };
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const t = parsed.data;
  const changes: Record<string, unknown> =
    t.action === 'submit'
      ? { status: 'in_review' }
      : t.action === 'reopen'
        ? { status: 'draft' }
        : t.action === 'publish'
          ? { status: 'published' }
          : t.action === 'approve'
            ? { status: 'approved', legal_checked: true, review_comment: t.comment || null }
            : { status: 'rejected', review_comment: t.comment };
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('content_items')
    .update(changes)
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o el contenido ya no existe.' };
  revalidatePath('/calendario');
  revalidatePath('/aprobaciones');
  return { ok: true };
}

/** Compliance documents: a person (never the system) approves them; the database enforces who may. */
export async function transitionDocument(id: string, action: string): Promise<ContentResult> {
  const parsed = z
    .object({ id: z.uuid(), action: z.enum(['submit', 'approve', 'reopen']) })
    .safeParse({ id, action });
  if (!parsed.success) return { ok: false, error: 'Solicitud inválida.' };
  if (!(await requireUser()))
    return { ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  const status = { submit: 'in_review', approve: 'approved', reopen: 'draft' }[parsed.data.action];
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from('compliance_documents')
    .update({ status })
    .eq('id', parsed.data.id)
    .select('id');
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: 'No tienes permiso o el documento ya no existe.' };
  revalidatePath('/cumplimiento');
  revalidatePath('/');
  return { ok: true };
}
