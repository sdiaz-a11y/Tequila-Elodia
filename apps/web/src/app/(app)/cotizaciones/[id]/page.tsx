import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/ui/access-denied';
import { SalesDocument, type DocData } from '@/components/sales/sales-document';
import { ENTITIES } from '@/lib/entities';
import { loadRelations, relationKeysOf } from '@/lib/entity-data';
import { canCollect, canManage, canRead, canWrite } from '@/lib/roles';
import { loadVariantChoices, toLines } from '@/lib/sales-data';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Cotización' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabase();
  const [quote, items, order, variants, relations] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, account:accounts!account_id(id,name)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('quote_items').select('*').eq('quote_id', id).order('created_at'),
    supabase.from('orders').select('id').eq('quote_id', id).maybeSingle(),
    loadVariantChoices(supabase),
    loadRelations(supabase, relationKeysOf(ENTITIES.quotes)),
  ]);
  if (!quote.data) notFound();
  const q = quote.data as Record<string, unknown>;
  const doc: DocData = {
    id,
    number: q.number as string,
    status: q.status as string,
    account: q.account as DocData['account'],
    notes: (q.notes as string | null) ?? null,
    valid_until: (q.valid_until as string | null) ?? null,
    subtotal: Number(q.subtotal),
    discount_total: Number(q.discount_total),
    tax_total: Number(q.tax_total),
    total: Number(q.total),
  };
  return (
    <div className="animate-fade-up">
      <SalesDocument
        kind="quote"
        doc={doc}
        lines={toLines(items.data)}
        variants={variants}
        payments={[]}
        orderId={(order.data as { id: string } | null)?.id ?? null}
        relations={relations}
        canWrite={canWrite(user)}
        canManage={canManage(user)}
        canCollect={canCollect(user)}
      />
    </div>
  );
}
