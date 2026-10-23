import { NextResponse, type NextRequest } from 'next/server';
import { toCsv } from '@/lib/csv';
import { REPORTS, isoDay } from '@/lib/reports';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Spec = {
  table: string;
  select: string;
  date: string;
  soft?: boolean;
  headers: string[];
  row: (r: Record<string, any>) => unknown[]; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const SPECS: Record<string, Spec> = {
  accounts: {
    table: 'accounts',
    select:
      'name,type,status,city,state,country,phone,email,created_at,owner:profiles!owner_id(name)',
    date: 'created_at',
    soft: true,
    headers: [
      'Nombre',
      'Tipo',
      'Estado',
      'Ciudad',
      'Estado (MX)',
      'País',
      'Teléfono',
      'Correo',
      'Responsable',
      'Alta',
    ],
    row: (r) => [
      r.name,
      r.type,
      r.status,
      r.city,
      r.state,
      r.country,
      r.phone,
      r.email,
      r.owner?.name,
      r.created_at,
    ],
  },
  opportunities: {
    table: 'opportunities',
    select:
      'title,amount,currency,expected_close,created_at,account:accounts(name),stage:pipeline_stages(name),owner:profiles!owner_id(name)',
    date: 'created_at',
    headers: [
      'Oportunidad',
      'Empresa',
      'Etapa',
      'Monto',
      'Moneda',
      'Cierre esperado',
      'Responsable',
      'Alta',
    ],
    row: (r) => [
      r.title,
      r.account?.name,
      r.stage?.name,
      r.amount,
      r.currency,
      r.expected_close,
      r.owner?.name,
      r.created_at,
    ],
  },
  quotes: {
    table: 'quotes',
    select:
      'number,status,valid_until,currency,subtotal,discount_total,tax_total,total,created_at,account:accounts(name)',
    date: 'created_at',
    headers: [
      'Folio',
      'Empresa',
      'Estado',
      'Vigencia',
      'Moneda',
      'Subtotal',
      'Descuento',
      'Impuesto',
      'Total',
      'Fecha',
    ],
    row: (r) => [
      r.number,
      r.account?.name,
      r.status,
      r.valid_until,
      r.currency,
      r.subtotal,
      r.discount_total,
      r.tax_total,
      r.total,
      r.created_at,
    ],
  },
  orders: {
    table: 'orders',
    select:
      'number,status,currency,total,paid_total,carrier,tracking,created_at,account:accounts(name)',
    date: 'created_at',
    headers: [
      'Folio',
      'Empresa',
      'Estado',
      'Moneda',
      'Total',
      'Cobrado',
      'Paquetería',
      'Guía',
      'Fecha',
    ],
    row: (r) => [
      r.number,
      r.account?.name,
      r.status,
      r.currency,
      r.total,
      r.paid_total,
      r.carrier,
      r.tracking,
      r.created_at,
    ],
  },
  social_posts: {
    table: 'content_items',
    select: 'title,channel,status,scheduled_at,post_url,reach,engagement',
    date: 'scheduled_at',
    headers: ['Título', 'Canal', 'Estado', 'Fecha', 'Enlace', 'Alcance', 'Interacciones'],
    row: (r) => [r.title, r.channel, r.status, r.scheduled_at, r.post_url, r.reach, r.engagement],
  },
  transactions: {
    table: 'transactions',
    select: 'kind,category,amount,currency,occurred_on,description',
    date: 'occurred_on',
    headers: ['Tipo', 'Categoría', 'Monto', 'Moneda', 'Fecha', 'Descripción'],
    row: (r) => [r.kind, r.category, r.amount, r.currency, r.occurred_on, r.description],
  },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse('No autorizado', { status: 401 });
  const def = REPORTS.find((r) => r.kind === kind);
  const spec = SPECS[kind];
  if (!def || !spec) return new NextResponse('No encontrado', { status: 404 });
  if (!def.allowed(user)) return new NextResponse('Sin permiso', { status: 403 });

  const from = isoDay(req.nextUrl.searchParams.get('from'));
  const to = isoDay(req.nextUrl.searchParams.get('to'));
  const supabase = await createSupabase();
  let q = supabase
    .from(spec.table)
    .select(spec.select)
    .order(spec.date, { ascending: false })
    .limit(5000);
  if (spec.soft) q = q.is('deleted_at', null);
  if (kind === 'social_posts') q = q.in('status', ['approved', 'published']);
  if (from) q = q.gte(spec.date, from);
  if (to) q = q.lte(spec.date, `${to}T23:59:59`);
  const { data, error } = await q;
  if (error) return new NextResponse('No se pudo generar el reporte', { status: 500 });

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  await supabase.rpc('log_export', { p_kind: kind, p_rows: rows.length, p_filters: { from, to } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(spec.headers, rows.map(spec.row)), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="elodia-${kind}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
