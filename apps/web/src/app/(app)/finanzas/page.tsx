import type { Metadata } from 'next';
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { EntityPage } from '@/components/entities/entity-page';
import { AccessDenied } from '@/components/ui/access-denied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dayKey } from '@/lib/calendar';
import { formatMoney } from '@/lib/format';
import { canFinance } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Finanzas' };

interface Tx {
  kind: 'income' | 'expense';
  category: string;
  amount: number;
  occurred_on: string;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || !canFinance(user)) return <AccessDenied />;
  const today = dayKey(new Date().toISOString());
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);

  const supabase = await createSupabase();
  const { data } = await supabase
    .from('transactions')
    .select('kind,category,amount,occurred_on')
    .gte('occurred_on', `${year}-01-01`)
    .lte('occurred_on', `${year}-12-31`)
    .limit(10000);
  const rows = ((data ?? []) as Tx[]).map((r) => ({ ...r, amount: Number(r.amount) }));
  const sum = (list: Tx[], kind: Tx['kind']) =>
    list.filter((r) => r.kind === kind).reduce((t, r) => t + r.amount, 0);
  const inMonth = rows.filter((r) => r.occurred_on.startsWith(month));
  const income = sum(inMonth, 'income');
  const expense = sum(inMonth, 'expense');
  const byCategory = [
    ...inMonth
      .filter((r) => r.kind === 'expense')
      .reduce(
        (m, r) => m.set(r.category, (m.get(r.category) ?? 0) + r.amount),
        new Map<string, number>(),
      ),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const summary = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section aria-label="Resumen del mes" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Ingresos del mes', value: income, icon: ArrowUpRight, tone: 'text-success' },
          { label: 'Egresos del mes', value: expense, icon: ArrowDownRight, tone: 'text-danger' },
          {
            label: 'Balance del mes',
            value: income - expense,
            icon: Scale,
            tone: income - expense < 0 ? 'text-danger' : 'text-gold',
          },
        ].map((k) => (
          <div
            key={k.label}
            className="grid gap-3 rounded-panel border border-line bg-surface p-5 shadow-panel"
          >
            <span className="flex items-center justify-between text-sm text-muted">
              {k.label}
              <k.icon className={`size-4 ${k.tone}`} aria-hidden />
            </span>
            <span className="tabular font-display text-2xl font-semibold text-fg">
              {formatMoney(k.value)}
            </span>
          </div>
        ))}
        <p className="tabular text-xs text-faint sm:col-span-3">
          Acumulado del año: ingresos {formatMoney(sum(rows, 'income'))} · egresos{' '}
          {formatMoney(sum(rows, 'expense'))} · balance{' '}
          {formatMoney(sum(rows, 'income') - sum(rows, 'expense'))}
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Egresos del mes por categoría</CardTitle>
          <CardDescription>Las seis más altas.</CardDescription>
        </CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted">Sin egresos este mes.</p>
          ) : (
            <ul className="grid gap-2.5">
              {byCategory.map(([cat, total]) => (
                <li key={cat} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-fg">{cat}</span>
                    <span className="tabular shrink-0 text-muted">{formatMoney(total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${(total / (byCategory[0]?.[1] || 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <EntityPage
      entityKey="transactions"
      group="Administración"
      title="Finanzas"
      description="Ingresos y egresos del negocio. Solo lo ve y lo mueve quien administra el dinero."
      searchParams={await searchParams}
      before={summary}
    />
  );
}
