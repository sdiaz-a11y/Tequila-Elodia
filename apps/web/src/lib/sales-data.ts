import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocLine, VariantChoice } from '@/lib/sales';

/** Active presentations to pick from when adding a line, with their current list price. */
export async function loadVariantChoices(supabase: SupabaseClient): Promise<VariantChoice[]> {
  const { data } = await supabase
    .from('product_variants')
    .select('id,sku,presentation,price,product:products!product_id(name)')
    .eq('status', 'active')
    .order('sku')
    .limit(300);
  return (
    (data ?? []) as unknown as {
      id: string;
      sku: string;
      presentation: string;
      price: number | null;
      product: { name: string } | null;
    }[]
  ).map((v) => ({
    id: v.id,
    sku: v.sku,
    presentation: v.presentation,
    price: v.price === null ? null : Number(v.price),
    product: v.product?.name ?? '—',
  }));
}

/** PostgREST returns numeric columns as numbers or strings depending on size: normalise once here. */
export function toLines(rows: unknown[] | null): DocLine[] {
  return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    variant_id: (r.variant_id as string | null) ?? null,
    description: r.description as string,
    quantity: Number(r.quantity),
    unit_price: Number(r.unit_price),
    discount_pct: Number(r.discount_pct),
    tax_rate: Number(r.tax_rate),
    line_total: Number(r.line_total),
    tax_amount: Number(r.tax_amount),
  }));
}
