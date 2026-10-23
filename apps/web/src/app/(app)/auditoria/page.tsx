import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AccessDenied } from '@/components/ui/access-denied';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { canAdmin } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Auditoría' };

const PAGE = 30;
const TABLES: Record<string, string> = {
  accounts: 'Empresas',
  contacts: 'Contactos',
  opportunities: 'Oportunidades',
  activities: 'Actividades',
  territories: 'Territorios',
  distributors: 'Distribuidores',
  pipeline_stages: 'Etapas del pipeline',
  profiles: 'Equipo',
};
const ACTIONS: Record<string, string> = {
  insert: 'Alta',
  update: 'Edición',
  delete: 'Eliminación',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || !canAdmin(user)) return <AccessDenied />;
  const sp = await searchParams;
  const table = sp.t && sp.t in TABLES ? sp.t : '';
  const action = sp.a && sp.a in ACTIONS ? sp.a : '';
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  const supabase = await createSupabase();
  let q = supabase
    .from('audit_log')
    .select('id,at,actor_email,table_name,row_id,action,old_row,new_row', { count: 'exact' });
  if (table) q = q.eq('table_name', table);
  if (action) q = q.eq('action', action);
  const { data, count } = await q
    .order('at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  const rows = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (table) u.set('t', table);
    if (action) u.set('a', action);
    if (p > 1) u.set('page', String(p));
    return `/auditoria${u.size ? `?${u}` : ''}`;
  };
  const select =
    'h-11 rounded-control border border-line bg-surface-2 px-3.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Administración</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Auditoría</h1>
        <p className="max-w-2xl text-sm text-muted">
          Quién creó, cambió o eliminó qué y cuándo. Se registra automáticamente en la base de datos
          y no se puede editar ni borrar.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <select name="t" defaultValue={table} aria-label="Filtrar por módulo" className={select}>
          <option value="">Todos los módulos</option>
          {Object.entries(TABLES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="a" defaultValue={action} aria-label="Filtrar por acción" className={select}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACTIONS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-control border border-line bg-surface-2 px-4 text-sm font-medium text-fg hover:border-line-strong hover:bg-surface-3"
        >
          Filtrar
        </button>
      </form>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Sin registros"
            description="Aquí aparecerá cada alta, edición y eliminación hecha en la plataforma."
          />
        ) : (
          <TableWrap>
            <Table aria-label="Bitácora de auditoría">
              <THead>
                <tr>
                  <TH>Fecha</TH>
                  <TH>Persona</TH>
                  <TH>Acción</TH>
                  <TH>Módulo</TH>
                  <TH>Detalle</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="tabular whitespace-nowrap text-muted">{formatDateTime(r.at)}</TD>
                    <TD>{r.actor_email ?? <span className="text-faint">Sistema</span>}</TD>
                    <TD>
                      <Badge
                        tone={
                          r.action === 'delete'
                            ? 'danger'
                            : r.action === 'update'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {ACTIONS[r.action] ?? r.action}
                      </Badge>
                    </TD>
                    <TD className="text-muted">{TABLES[r.table_name] ?? r.table_name}</TD>
                    <TD>
                      <details className="text-xs text-muted">
                        <summary className="cursor-pointer select-none text-gold">Ver</summary>
                        <pre className="mt-2 max-h-60 max-w-[34rem] overflow-auto rounded-control border border-line bg-background p-3 leading-relaxed">
                          {JSON.stringify(
                            r.action === 'insert'
                              ? r.new_row
                              : r.action === 'delete'
                                ? r.old_row
                                : { antes: r.old_row, después: r.new_row },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        {total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <p className="tabular">
              {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={href(page - 1)}
                  aria-label="Página anterior"
                  className="grid size-9 place-items-center rounded-control hover:bg-surface-2"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </Link>
              ) : null}
              <span className="tabular">
                {page} / {pages}
              </span>
              {page < pages ? (
                <Link
                  href={href(page + 1)}
                  aria-label="Página siguiente"
                  className="grid size-9 place-items-center rounded-control hover:bg-surface-2"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
