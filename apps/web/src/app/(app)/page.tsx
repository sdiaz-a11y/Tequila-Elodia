import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  Handshake,
  ListChecks,
  Megaphone,
  Target,
  Truck,
  TriangleAlert,
} from 'lucide-react';
import { StarDivider } from '@/components/brand/star-divider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { dayInDays, formatDateTime, formatMoney, isOverdue } from '@/lib/format';
import { canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { formatLongDate, greetingFor } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard ejecutivo' };

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null; // the (app) layout already redirected
  const firstName = user.name.trim().split(/\s+/)[0];

  let stats: {
    prospects: number;
    clients: number;
    distributors: number;
    activeDistributors: number;
    openCount: number;
    openValue: number;
    wonCount: number;
    wonValue: number;
    pending: number;
    overdue: number;
    openTasks: number;
    activeCampaigns: number;
    expiringDocs: number;
    upcoming: {
      id: string;
      subject: string;
      due_at: string | null;
      account: { name: string } | null;
    }[];
    stages: { name: string; kind: string; n: number; sum: number }[];
  } | null = null;

  if (canRead(user)) {
    const supabase = await createSupabase();
    const head = { count: 'exact' as const, head: true };
    const [
      prospects,
      clients,
      distributors,
      activeDistributors,
      pending,
      overdue,
      openTasks,
      activeCampaigns,
      expiringDocs,
      stagesRes,
      oppsRes,
      upcoming,
    ] = await Promise.all([
      count(
        supabase.from('accounts').select('id', head).is('deleted_at', null).eq('type', 'prospect'),
      ),
      count(
        supabase.from('accounts').select('id', head).is('deleted_at', null).eq('type', 'client'),
      ),
      count(supabase.from('distributors').select('id', head)),
      count(supabase.from('distributors').select('id', head).eq('status', 'active')),
      count(supabase.from('activities').select('id', head).is('done_at', null)),
      count(
        supabase
          .from('activities')
          .select('id', head)
          .is('done_at', null)
          .lt('due_at', new Date().toISOString()),
      ),
      count(supabase.from('tasks').select('id', head).neq('status', 'done')),
      count(supabase.from('campaigns').select('id', head).eq('status', 'active')),
      count(
        supabase
          .from('compliance_documents')
          .select('id', head)
          .not('expires_on', 'is', null)
          .lte('expires_on', dayInDays(30)),
      ),
      supabase.from('pipeline_stages').select('id,name,kind').order('position'),
      supabase.from('opportunities').select('stage_id,amount').limit(2000),
      supabase
        .from('activities')
        .select('id,subject,due_at,account:accounts!account_id(name)')
        .is('done_at', null)
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(6),
    ]);
    const stageRows = stagesRes.data ?? [];
    const opps = oppsRes.data ?? [];
    const stages = stageRows.map((s) => {
      const mine = opps.filter((o) => o.stage_id === s.id);
      return {
        name: s.name,
        kind: s.kind,
        n: mine.length,
        sum: mine.reduce((t, o) => t + Number(o.amount), 0),
      };
    });
    const sum = (kind: string) => stages.filter((s) => s.kind === kind);
    stats = {
      prospects,
      clients,
      distributors,
      activeDistributors,
      openCount: sum('open').reduce((t, s) => t + s.n, 0),
      openValue: sum('open').reduce((t, s) => t + s.sum, 0),
      wonCount: sum('won').reduce((t, s) => t + s.n, 0),
      wonValue: sum('won').reduce((t, s) => t + s.sum, 0),
      pending,
      overdue,
      openTasks,
      activeCampaigns,
      expiringDocs,
      upcoming: (upcoming.data ?? []) as unknown as NonNullable<typeof stats>['upcoming'],
      stages,
    };
  }

  const nothingYet =
    stats && stats.prospects + stats.clients + stats.distributors + stats.openCount === 0;
  const maxStage = Math.max(1, ...(stats?.stages.map((s) => s.n) ?? [1]));

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-10">
      <header className="grid gap-4">
        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl">
          {greetingFor()}, <span className="text-gold">{firstName}</span>
        </h1>
        <StarDivider className="w-48" />
        <p className="text-sm text-muted first-letter:uppercase">{formatLongDate()}</p>
      </header>

      {!stats ? (
        <Card>
          <EmptyState
            title="Tu rol no incluye indicadores"
            description="Si necesitas ver las cifras comerciales, pide a un administrador que revise tu acceso."
          />
        </Card>
      ) : (
        <>
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Kpi
              icon={Handshake}
              label="Prospectos"
              value={String(stats.prospects)}
              href="/empresas?f_type=prospect"
            />
            <Kpi
              icon={Handshake}
              label="Clientes"
              value={String(stats.clients)}
              href="/empresas?f_type=client"
            />
            <Kpi
              icon={Truck}
              label="Distribuidores"
              value={String(stats.distributors)}
              hint={`${stats.activeDistributors} activos`}
              href="/distribuidores"
            />
            <Kpi
              icon={Target}
              label="Pipeline abierto"
              value={formatMoney(stats.openValue)}
              hint={`${stats.openCount} oportunidades`}
              href="/pipeline"
            />
            <Kpi
              icon={ListChecks}
              label="Tareas abiertas"
              value={String(stats.openTasks)}
              hint="Ver tablero"
              href="/tareas"
            />
            <Kpi
              icon={Megaphone}
              label="Campañas activas"
              value={String(stats.activeCampaigns)}
              hint="Ver campañas"
              href="/campanas"
            />
          </section>

          {stats.expiringDocs > 0 ? (
            <Link
              href="/cumplimiento"
              className="flex items-center justify-between gap-3 rounded-panel border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning transition-colors hover:bg-warning/15"
            >
              <span className="flex items-center gap-2.5">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
                {stats.expiringDocs}{' '}
                {stats.expiringDocs === 1 ? 'documento vence' : 'documentos vencen'} en los próximos
                30 días o ya {stats.expiringDocs === 1 ? 'venció' : 'vencieron'}.
              </span>
              <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : null}

          {nothingYet ? (
            <Card>
              <EmptyState
                icon={Handshake}
                title="Empieza registrando tu primera empresa"
                description="Cuando captures empresas, oportunidades y actividades, sus cifras aparecerán aquí. ELODIA OS no muestra datos de ejemplo."
                action={
                  <Link
                    href="/empresas"
                    className="inline-flex h-10 items-center gap-2 rounded-control bg-gold px-4 text-sm font-medium text-background hover:bg-[#e3c88e]"
                  >
                    Ir a Empresas <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Oportunidades por etapa</CardTitle>
                  <CardDescription>
                    Ganadas: <span className="tabular text-fg">{stats.wonCount}</span> ·{' '}
                    <span className="tabular text-fg">{formatMoney(stats.wonValue)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3">
                    {stats.stages.map((s) => (
                      <li key={s.name} className="grid gap-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-fg">{s.name}</span>
                          <span className="tabular text-muted">
                            {s.n} · {formatMoney(s.sum)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className={`h-full rounded-full ${s.kind === 'lost' ? 'bg-danger/70' : s.kind === 'won' ? 'bg-success' : 'bg-gold'}`}
                            style={{ width: `${(s.n / maxStage) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <CardTitle>Próximas actividades</CardTitle>
                    <CardDescription>
                      {stats.pending} pendientes
                      {stats.overdue ? ` · ${stats.overdue} vencidas` : ''}
                    </CardDescription>
                  </div>
                  {stats.overdue ? (
                    <Badge tone="danger">
                      <TriangleAlert className="size-3" aria-hidden />
                      Vencidas
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {stats.upcoming.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title="Todo al día"
                      description="No hay actividades pendientes."
                      className="py-8"
                    />
                  ) : (
                    <ul className="divide-y divide-line">
                      {stats.upcoming.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-3 py-2.5 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-fg">{a.subject}</span>
                            <span className="text-[0.8125rem] text-muted">
                              {a.account?.name ?? 'Sin empresa'}
                            </span>
                          </span>
                          <span
                            className={`tabular shrink-0 text-xs ${isOverdue(a.due_at, null) ? 'text-danger' : 'text-muted'}`}
                          >
                            {a.due_at ? formatDateTime(a.due_at) : 'Sin fecha'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group grid gap-3 rounded-panel border border-line bg-surface p-5 shadow-panel transition-colors hover:border-line-strong"
    >
      <span className="flex items-center justify-between text-muted">
        <span className="text-sm">{label}</span>
        <Icon className="size-4 text-gold" aria-hidden />
      </span>
      <span className="tabular font-display text-3xl font-semibold text-fg">{value}</span>
      <span className="text-xs text-faint">{hint ?? 'Ver detalle'}</span>
    </Link>
  );
}
