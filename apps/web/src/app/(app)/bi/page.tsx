import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import { canFinance, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Business Intelligence' };

const MONTHS = 6;
const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) =>
  new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
    new Date(`${k}-01T00:00:00Z`),
  );

function lastMonths(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = MONTHS - 1; i >= 0; i--)
    out.push(
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7),
    );
  return out;
}

function Bars({
  rows,
  money = true,
}: {
  rows: { label: string; value: number }[];
  money?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value)) return <p className="text-sm text-muted">Aún no hay datos.</p>;
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid gap-1">
          <span className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted">{r.label}</span>
            <span className="tabular shrink-0 text-fg">
              {money ? formatMoney(r.value) : r.value}
            </span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <span
              className="block h-full rounded-full bg-gold"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function BiPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canRead(user)) return <AccessDenied />;
  const supabase = await createSupabase();
  const months = lastMonths();
  const since = `${months[0]}-01`;
  const withFinance = canFinance(user);

  const [stages, opps, orders, content, tx] = await Promise.all([
    supabase.from('pipeline_stages').select('id,name,position,kind').order('position'),
    supabase.from('opportunities').select('stage_id,amount'),
    supabase
      .from('orders')
      .select('total,created_at')
      .neq('status', 'cancelled')
      .gte('created_at', since),
    supabase.from('content_items').select('status'),
    withFinance
      ? supabase.from('transactions').select('kind,amount,occurred_on').gte('occurred_on', since)
      : Promise.resolve({ data: [] as { kind: string; amount: number; occurred_on: string }[] }),
  ]);

  const byStage = new Map<string, number>();
  for (const o of (opps.data ?? []) as { stage_id: string; amount: number }[])
    byStage.set(o.stage_id, (byStage.get(o.stage_id) ?? 0) + Number(o.amount));
  const pipeline = ((stages.data ?? []) as { id: string; name: string; kind: string }[])
    .filter((s) => s.kind === 'open')
    .map((s) => ({ label: s.name, value: byStage.get(s.id) ?? 0 }));

  const sum = (rows: { d: string; v: number }[]) =>
    months.map((m) => ({
      label: monthLabel(m),
      value: rows.filter((r) => monthKey(r.d) === m).reduce((a, r) => a + r.v, 0),
    }));
  const sales = sum(
    ((orders.data ?? []) as { total: number; created_at: string }[]).map((o) => ({
      d: o.created_at,
      v: Number(o.total),
    })),
  );
  const txRows = (tx.data ?? []) as { kind: string; amount: number; occurred_on: string }[];
  const income = sum(
    txRows
      .filter((t) => t.kind === 'income')
      .map((t) => ({ d: t.occurred_on, v: Number(t.amount) })),
  );
  const expense = sum(
    txRows
      .filter((t) => t.kind === 'expense')
      .map((t) => ({ d: t.occurred_on, v: Number(t.amount) })),
  );

  const STATUS: Record<string, string> = {
    idea: 'Idea',
    draft: 'Borrador',
    in_review: 'En revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    published: 'Publicado',
  };
  const contentRows = Object.entries(STATUS).map(([k, label]) => ({
    label,
    value: ((content.data ?? []) as { status: string }[]).filter((c) => c.status === k).length,
  }));

  const panels: {
    title: string;
    description: string;
    rows: { label: string; value: number }[];
    money?: boolean;
  }[] = [
    {
      title: 'Pipeline abierto',
      description: 'Monto por etapa, sin ganadas ni perdidas.',
      rows: pipeline,
    },
    {
      title: 'Ventas (pedidos)',
      description: `Total de pedidos no cancelados, últimos ${MONTHS} meses.`,
      rows: sales,
    },
    ...(withFinance
      ? [
          { title: 'Ingresos', description: 'Registrados en finanzas.', rows: income },
          { title: 'Gastos', description: 'Registrados en finanzas.', rows: expense },
        ]
      : []),
    {
      title: 'Contenido por estado',
      description: 'Piezas del calendario editorial.',
      rows: contentRows,
      money: false,
    },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="font-display text-3xl text-fg">Business Intelligence</h1>
        <p className="mt-1 text-sm text-muted">
          Lectura rápida del negocio con los datos registrados en la plataforma.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {panels.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <CardTitle>{p.title}</CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Bars rows={p.rows} money={p.money} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
