import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import { StarDivider } from '@/components/brand/star-divider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { COMING_SOON_LABEL, visibleNav } from '@/lib/nav';
import { formatRange, parsePeriod, periodRange } from '@/lib/period';
import { API_URL, getSessionUser } from '@/lib/session';
import { formatLongDate, greetingFor } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard ejecutivo' };

async function databaseUp(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const [{ periodo }, user, dbOk] = await Promise.all([
    searchParams,
    getSessionUser(),
    databaseUp(),
  ]);
  if (!user) return null; // the (app) layout already redirected
  const range = formatRange(periodRange(parsePeriod(periodo)));
  const firstName = user.name.trim().split(/\s+/)[0];
  const date = formatLongDate();
  const groups = visibleNav(user);

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-10">
      <header className="grid gap-4">
        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl">
          {greetingFor()}, <span className="text-gold">{firstName}</span>
        </h1>
        <StarDivider className="w-48" />
        <p className="text-sm text-muted first-letter:uppercase">{date}</p>
      </header>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="grid gap-1">
            <CardTitle>Indicadores del periodo</CardTitle>
            <CardDescription>Ventas, pipeline, campañas y tareas con datos reales.</CardDescription>
          </div>
          <Badge className="tabular shrink-0">{range}</Badge>
        </CardHeader>
        <CardContent className="pt-2">
          <EmptyState
            icon={BarChart3}
            title="Aún no hay indicadores que mostrar"
            description="Cuando se registren cuentas, oportunidades, campañas y tareas, sus cifras aparecerán aquí. ELODIA OS no muestra datos de ejemplo."
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de la plataforma</CardTitle>
            <CardDescription>Comprobado al abrir esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              <StatusRow
                ok
                label="Sesión segura"
                detail="Cookie protegida y permisos verificados en el servidor"
              />
              <StatusRow
                ok={dbOk}
                label="Base de datos"
                detail={dbOk ? 'Conectada' : 'Sin respuesta; reintenta en unos minutos'}
              />
              <StatusRow
                ok={user.totpEnabled}
                neutral={!user.totpEnabled}
                label="Verificación en dos pasos"
                detail={user.totpEnabled ? 'Activa en tu cuenta' : 'No activada'}
                action={
                  user.totpEnabled ? null : (
                    <Link
                      href="/cuenta/seguridad"
                      className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                    >
                      Activar <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  )
                }
              />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Módulos</CardTitle>
            <CardDescription>Lo que tu rol puede ver y cuándo llega cada módulo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {groups.map((g) => (
              <div key={g.label} className="grid gap-2">
                <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-faint">
                  {g.label}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {g.items.map((i) => (
                    <li key={i.href}>
                      {i.status === 'live' ? (
                        <Link href={i.href} className="inline-flex">
                          <Badge tone="gold">{i.label}</Badge>
                        </Link>
                      ) : (
                        <Badge>
                          {i.label} · {COMING_SOON_LABEL}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusRow({
  ok,
  neutral,
  label,
  detail,
  action,
}: {
  ok: boolean;
  neutral?: boolean;
  label: string;
  detail: string;
  action?: React.ReactNode;
}) {
  const Icon = neutral ? CircleDashed : ok ? CircleCheck : CircleX;
  const tone = neutral ? 'text-warning' : ok ? 'text-success' : 'text-danger';
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Icon className={`size-[1.125rem] shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="truncate text-[0.8125rem] text-muted">{detail}</p>
      </div>
      {action}
    </li>
  );
}
