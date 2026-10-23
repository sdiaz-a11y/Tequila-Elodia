import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccessDenied } from '@/components/ui/access-denied';
import { SalesDocument, type DocData, type PaymentRow } from '@/components/sales/sales-document';
import { ENTITIES } from '@/lib/entities';
import { loadRelations, relationKeysOf } from '@/lib/entity-data';
import { canCollect, canManage, canRead, canWrite } from '@/lib/roles';
import { loadVariantChoices, toLines } from '@/lib/sales-data';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pedido' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  if (!UUID.test(id)) notFound();
  const collect = canCollect(user);
  const supabase = await createSupabase();
  const [order, items, payments, variants, relations] = await Promise.all([
    supabase
      .from('orders')
      .select('*, account:accounts!account_id(id,name)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
    collect
      ? supabase
          .from('payments')
          .select('id,amount,paid_on,method,reference')
          .eq('order_id', id)
          .order('paid_on', { ascending: false })
      : Promise.resolve({ data: [] }),
    loadVariantChoices(supabase),
    loadRelations(supabase, relationKeysOf(ENTITIES.orders)),
  ]);
  if (!order.data) notFound();
  const o = order.data as Record<string, unknown>;
  const doc: DocData = {
    id,
    number: o.number as string,
    status: o.status as string,
    account: o.account as DocData['account'],
    notes: (o.notes as string | null) ?? null,
    quote_id: (o.quote_id as string | null) ?? null,
    subtotal: Number(o.subtotal),
    discount_total: Number(o.discount_total),
    tax_total: Number(o.tax_total),
    total: Number(o.total),
    paid_total: Number(o.paid_total),
    carrier: (o.carrier as string | null) ?? null,
    tracking: (o.tracking as string | null) ?? null,
    shipped_at: (o.shipped_at as string | null) ?? null,
    delivered_at: (o.delivered_at as string | null) ?? null,
  };
  return (
    <div className="animate-fade-up">
      <SalesDocument
        kind="order"
        doc={doc}
        lines={toLines(items.data)}
        variants={variants}
        payments={((payments.data ?? []) as PaymentRow[]).map((p) => ({
          ...p,
          amount: Number(p.amount),
        }))}
        orderId={null}
        relations={relations}
        canWrite={canWrite(user)}
        canManage={canManage(user)}
        canCollect={collect}
      />
    </div>
  );
}
