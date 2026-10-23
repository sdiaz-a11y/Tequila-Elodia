import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntityDef, Option, RelationKey } from '@/lib/entities';

export const PAGE_SIZE = 20;

export interface ListParams {
  q: string;
  page: number;
  filters: Record<string, string>;
}

export function parseListParams(
  def: EntityDef,
  sp: Record<string, string | string[] | undefined>,
): ListParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? '';
  const filters: Record<string, string> = {};
  for (const f of def.filters) {
    const v = one(`f_${f.name}`);
    if (f.options.some((o) => o.value === v)) filters[f.name] = v;
  }
  const page = Number.parseInt(one('page'), 10);
  return { q: one('q').trim().slice(0, 100), page: page > 0 ? page : 1, filters };
}

/** PostgREST `or` filters use commas and parentheses as syntax, so user text is reduced to safe characters. */
const safeTerm = (q: string) => q.replace(/[^\p{L}\p{N}\s@._+-]/gu, ' ').trim();

export async function listRows(supabase: SupabaseClient, def: EntityDef, p: ListParams) {
  let query = supabase.from(def.table).select(def.select, { count: 'exact' });
  if (def.softDelete) query = query.is('deleted_at', null);
  for (const [name, value] of Object.entries(p.filters)) query = query.eq(name, value);
  const term = safeTerm(p.q);
  if (term && def.search.length)
    query = query.or(def.search.map((c) => `${c}.ilike.%${term}%`).join(','));
  const from = (p.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order(def.order.column, { ascending: def.order.ascending, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], total: count ?? 0 };
}

const RELATIONS: Record<
  RelationKey,
  { table: string; label: string; order: string; only?: 'not_deleted' | 'active' }
> = {
  accounts: { table: 'accounts', label: 'name', order: 'name', only: 'not_deleted' },
  territories: { table: 'territories', label: 'name', order: 'name' },
  profiles: { table: 'profiles', label: 'name', order: 'name', only: 'active' },
  stages: { table: 'pipeline_stages', label: 'name', order: 'position' },
  opportunities: { table: 'opportunities', label: 'title', order: 'title' },
};

/** Choices for relation fields (company, owner, stage…). Capped: very large lists need a search box later. */
export async function loadRelations(
  supabase: SupabaseClient,
  keys: readonly RelationKey[],
): Promise<Partial<Record<RelationKey, Option[]>>> {
  const out: Partial<Record<RelationKey, Option[]>> = {};
  await Promise.all(
    [...new Set(keys)].map(async (key) => {
      const r = RELATIONS[key];
      let q = supabase.from(r.table).select(`id, ${r.label}`);
      if (r.only === 'not_deleted') q = q.is('deleted_at', null);
      if (r.only === 'active') q = q.eq('active', true);
      const { data } = await q.order(r.order).limit(500);
      out[key] = ((data ?? []) as unknown as Record<string, string>[]).map((row) => ({
        value: row.id as string,
        label: (row[r.label] as string) || '—',
      }));
    }),
  );
  return out;
}

export const relationKeysOf = (def: EntityDef): RelationKey[] =>
  def.fields.flatMap((f) => (f.relation ? [f.relation] : []));
