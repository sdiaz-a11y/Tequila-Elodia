'use client';

import { Fragment, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight, Download, ScrollText, Search } from 'lucide-react';
import { RESOURCES, type AuditRow, type Paginated } from '@elodia/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/field';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import { ApiError, api } from '@/lib/api';
import {
  AUDIT_ACTION_LABELS,
  RESOURCE_LABELS,
  auditActionLabel,
  auditResourceLabel,
  dayRangeToIso,
  formatDateTime,
} from '@/lib/labels';
import { useSession } from '@/lib/session-client';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

const errorText = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

const toneFor = (action: string): 'danger' | 'warning' | 'gold' | 'neutral' => {
  if (['login_failed', 'login_blocked', 'disable'].includes(action)) return 'danger';
  if (
    ['reset_password', 'change_password', 'update_grants', 'reset_grants', 'unlock'].includes(
      action,
    )
  )
    return 'warning';
  if (action === 'export') return 'gold';
  return 'neutral';
};

function Details({ row }: { row: AuditRow }) {
  const block = (title: string, value: unknown) =>
    value === null || value === undefined ? null : (
      <div className="min-w-0">
        <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-faint">
          {title}
        </p>
        <pre className="max-h-64 overflow-auto rounded-control border border-line bg-background p-3 text-xs leading-relaxed text-muted">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  const before = block('Antes', row.before);
  const after = block('Después', row.after);
  return (
    <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
      {before}
      {after}
      {!before && !after ? (
        <p className="text-sm text-muted">Este registro no tiene datos adicionales.</p>
      ) : null}
      <p className="tabular text-xs text-faint sm:col-span-2">
        ID del registro: {row.id}
        {row.resourceId ? ` · ID del recurso: ${row.resourceId}` : ''}
      </p>
    </div>
  );
}

export function AuditPanel() {
  const me = useSession();
  const canExport = 'audit:export' in me.permissions;

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const range = dayRangeToIso(from, to);
  const filterParams = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (action) params.set('action', action);
    if (resource) params.set('resource', resource);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    return params;
  };

  const logs = useQuery({
    queryKey: ['admin', 'audit', { q, action, resource, from: range.from, to: range.to, page }],
    queryFn: () => {
      const params = filterParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      return api<Paginated<AuditRow>>(`/audit-logs?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const rows = logs.data?.data ?? [];
  const meta = logs.data?.meta;
  const pages = meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  const filtered = Boolean(q || action || resource || from || to);
  const invalidRange = Boolean(from && to && from > to);
  const resetPage = () => setPage(1);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-[16rem]">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar persona, acción o ID"
            aria-label="Buscar en la bitácora"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Filtrar por acción"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            resetPage();
          }}
          className="w-auto min-w-40"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por módulo"
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            resetPage();
          }}
          className="w-auto min-w-40"
        >
          <option value="">Todos los módulos</option>
          <option value="auth">Sesión</option>
          {RESOURCES.map((r) => (
            <option key={r} value={r}>
              {RESOURCE_LABELS[r]}
            </option>
          ))}
        </Select>
        <label className="grid gap-1 text-xs text-faint">
          Desde
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPage();
            }}
            className="h-11 w-auto"
          />
        </label>
        <label className="grid gap-1 text-xs text-faint">
          Hasta
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              resetPage();
            }}
            className="h-11 w-auto"
          />
        </label>
        {canExport ? (
          <Button
            variant="secondary"
            className="ml-auto"
            disabled={invalidRange}
            asChild={!invalidRange}
          >
            {invalidRange ? (
              <>
                <Download aria-hidden />
                Exportar CSV
              </>
            ) : (
              // A plain GET: the browser sends the session cookie and downloads the file.
              <a href={`/api/v1/audit-logs/export.csv?${filterParams()}`} download>
                <Download aria-hidden />
                Exportar CSV
              </a>
            )}
          </Button>
        ) : null}
      </div>
      {invalidRange ? (
        <p role="alert" className="text-sm text-danger">
          La fecha inicial no puede ser posterior a la final.
        </p>
      ) : null}

      <Card className="overflow-hidden">
        {logs.isPending ? (
          <div className="grid gap-px p-4" aria-busy="true" aria-label="Cargando bitácora">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-12 rounded-control" />
            ))}
          </div>
        ) : logs.isError ? (
          <EmptyState
            title="No pudimos cargar la bitácora"
            description={errorText(logs.error)}
            action={
              <Button variant="secondary" onClick={() => void logs.refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={filtered ? 'Sin resultados' : 'La bitácora está vacía'}
            description={
              filtered
                ? 'Ningún registro coincide con los filtros. Amplía el rango o cambia la búsqueda.'
                : 'Aquí aparecerá cada inicio de sesión, alta, cambio de permisos y exportación.'
            }
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
                  <TH className="hidden md:table-cell">IP</TH>
                  <TH className="w-12">
                    <span className="sr-only">Detalle</span>
                  </TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((r) => {
                  const expanded = open === r.id;
                  return (
                    <Fragment key={r.id}>
                      <TR>
                        <TD className="tabular whitespace-nowrap text-muted">
                          {formatDateTime(r.createdAt)}
                        </TD>
                        <TD>
                          {r.user ? (
                            <>
                              <p className="font-medium">{r.user.name}</p>
                              <p className="text-[0.8125rem] text-muted">{r.user.email}</p>
                            </>
                          ) : (
                            <span className="text-muted">Sistema o intento sin sesión</span>
                          )}
                        </TD>
                        <TD>
                          <Badge tone={toneFor(r.action)}>{auditActionLabel(r.action)}</Badge>
                        </TD>
                        <TD className="text-muted">{auditResourceLabel(r.resource)}</TD>
                        <TD className="tabular hidden text-muted md:table-cell">{r.ip ?? '—'}</TD>
                        <TD>
                          {r.before || r.after ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                              onClick={() => setOpen(expanded ? null : r.id)}
                            >
                              <ChevronDown
                                className={cn('transition-transform', expanded && 'rotate-180')}
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                        </TD>
                      </TR>
                      {expanded ? (
                        <tr className="border-b border-line/60 bg-surface-2/30">
                          <td colSpan={6}>
                            <Details row={r} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {meta && meta.total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <p className="tabular" aria-live="polite">
              {(meta.page - 1) * meta.pageSize + 1}–
              {Math.min(meta.page * meta.pageSize, meta.total)} de {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <span className="tabular px-1">
                {page} / {pages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Página siguiente"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
      <p className="text-xs text-faint">
        La bitácora solo se escribe: ningún registro se puede editar ni borrar. La exportación
        admite hasta 10,000 filas y queda registrada.
      </p>
    </div>
  );
}
