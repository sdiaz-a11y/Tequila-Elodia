'use server';

import { canApprove, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export interface NotificationItem {
  key: string;
  href: string;
  text: string;
  tone: 'danger' | 'warn' | 'info';
}

const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

/** Computed on demand from live data; the database (RLS) decides what each person may see. */
export async function getNotifications(): Promise<NotificationItem[]> {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return [];
  const supabase = await createSupabase();
  const head = { count: 'exact' as const, head: true };
  const now = new Date().toISOString();

  const [tasks, acts, docs, review, quotes, variants, stock] = await Promise.all([
    supabase.from('tasks').select('id', head).neq('status', 'done').lt('due_on', day()),
    supabase.from('activities').select('id', head).is('done_at', null).lt('due_at', now),
    supabase
      .from('compliance_documents')
      .select('id', head)
      .not('expires_on', 'is', null)
      .lte('expires_on', day(30)),
    canApprove(user)
      ? supabase.from('content_items').select('id', head).eq('status', 'in_review')
      : Promise.resolve({ count: 0 }),
    supabase
      .from('quotes')
      .select('id', head)
      .eq('status', 'sent')
      .lt('updated_at', new Date(Date.now() - 7 * 864e5).toISOString()),
    supabase.from('product_variants').select('id,min_stock').not('min_stock', 'is', null),
    supabase.from('inventory_stock').select('variant_id,available'),
  ]);

  const available = new Map<string, number>();
  for (const s of (stock.data ?? []) as { variant_id: string; available: number }[])
    available.set(s.variant_id, (available.get(s.variant_id) ?? 0) + Number(s.available));
  const low = ((variants.data ?? []) as { id: string; min_stock: number }[]).filter(
    (v) => (available.get(v.id) ?? 0) < Number(v.min_stock),
  ).length;

  const out: NotificationItem[] = [];
  const add = (
    n: number | null,
    key: string,
    href: string,
    one: string,
    many: string,
    tone: NotificationItem['tone'],
  ) => {
    if (n) out.push({ key, href, tone, text: n === 1 ? one : many.replace('{n}', String(n)) });
  };
  add(tasks.count, 'tasks', '/tareas', '1 tarea vencida', '{n} tareas vencidas', 'danger');
  add(
    acts.count,
    'acts',
    '/actividades',
    '1 actividad vencida',
    '{n} actividades vencidas',
    'danger',
  );
  add(
    docs.count,
    'docs',
    '/cumplimiento',
    '1 documento vence en 30 días o ya venció',
    '{n} documentos vencen en 30 días o ya vencieron',
    'warn',
  );
  add(
    low,
    'stock',
    '/inventario',
    '1 presentación bajo el stock mínimo',
    '{n} presentaciones bajo el stock mínimo',
    'warn',
  );
  add(
    review.count,
    'review',
    '/aprobaciones',
    '1 contenido espera tu revisión',
    '{n} contenidos esperan tu revisión',
    'info',
  );
  add(
    quotes.count,
    'quotes',
    '/cotizaciones',
    '1 cotización enviada sin respuesta hace más de 7 días',
    '{n} cotizaciones enviadas sin respuesta hace más de 7 días',
    'info',
  );
  return out;
}
