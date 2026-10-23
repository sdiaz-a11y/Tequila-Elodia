'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  Send,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { transitionDocument } from '@/app/actions/content';
import { deleteRow, saveRow, setActivityDone } from '@/app/actions/entities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Select } from '@/components/ui/field';
import { Table, TableWrap, TD, TH, THead, TR } from '@/components/ui/table';
import {
  getPath,
  type Column,
  type EntityDef,
  type Option,
  type RelationKey,
} from '@/lib/entities';
import {
  daysUntil,
  formatDateTime,
  formatDay,
  formatMoney,
  formatMoney2,
  isOverdue,
} from '@/lib/format';
import { EntityFormDialog } from './entity-form-dialog';

const PAGE_SIZE = 20;
type Row = Record<string, unknown>;

function Cell({ col, row }: { col: Column; row: Row }) {
  const value = getPath(row, col.path);
  if (value === null || value === undefined || value === '')
    return <span className="text-faint">—</span>;
  switch (col.as) {
    case 'badge': {
      const label = col.options?.find((o) => o.value === value)?.label ?? String(value);
      return <Badge tone={value === 'active' ? 'success' : 'gold'}>{label}</Badge>;
    }
    case 'money2':
      return <span className="tabular">{formatMoney2(value as number)}</span>;
    case 'money':
      return <span className="tabular">{formatMoney(value as number)}</span>;
    case 'date':
      return <span className="tabular whitespace-nowrap">{formatDay(value as string)}</span>;
    case 'datetime': {
      const late = isOverdue(value as string, row.done_at as string | null);
      return (
        <span className={`tabular whitespace-nowrap ${late ? 'text-danger' : ''}`}>
          {formatDateTime(value as string)}
          {late ? ' · vencida' : ''}
        </span>
      );
    }
    case 'expiry': {
      const days = daysUntil(String(value));
      return (
        <span className="tabular inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap">
          {formatDay(value as string)}
          {days < 0 ? (
            <Badge tone="danger">Vencido</Badge>
          ) : days <= 30 ? (
            <Badge tone="warning">Vence pronto</Badge>
          ) : null}
        </span>
      );
    }
    case 'bool':
      return value ? <Badge tone="gold">Sí</Badge> : <span className="text-faint">No</span>;
    default:
      return <span className="line-clamp-2">{String(value)}</span>;
  }
}

export function EntityManager({
  def,
  rows,
  total,
  page,
  q,
  filters,
  relations,
  canWrite,
  canDelete,
  canApprove = false,
}: {
  def: EntityDef;
  rows: Row[];
  total: number;
  page: number;
  q: string;
  filters: Record<string, string>;
  relations: Partial<Record<RelationKey, Option[]>>;
  canWrite: boolean;
  canDelete: boolean;
  canApprove?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  const navigate = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next}`));
  };

  // Debounced search: one request per pause in typing, not per key.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => navigate({ q: search.trim(), page: '' }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || Object.keys(filters).length);
  const article = def.isFeminine ? 'Nueva' : 'Nuevo';
  const isActivities = def.key === 'activities';

  async function confirmDelete() {
    if (!removing) return;
    setBusy(true);
    const res = await deleteRow(def.key, removing.id as string);
    setBusy(false);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo eliminar.');
    toast.success(
      `${def.singular[0]!.toUpperCase()}${def.singular.slice(1)} eliminad${def.isFeminine ? 'a' : 'o'}`,
    );
    setRemoving(null);
    router.refresh();
  }

  async function documentAction(row: Row, action: 'submit' | 'approve' | 'reopen') {
    const res = await transitionDocument(row.id as string, action);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo completar.');
    toast.success(
      action === 'approve'
        ? 'Documento aprobado'
        : action === 'submit'
          ? 'Enviado a revisión'
          : 'Devuelto a borrador',
    );
    router.refresh();
  }

  async function toggleDone(row: Row) {
    const res = await setActivityDone(row.id as string, !row.done_at);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo actualizar.');
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {def.search.length ? (
          <div className="relative min-w-56 flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${def.plural.toLowerCase()}`}
              aria-label={`Buscar ${def.plural.toLowerCase()}`}
              className="pl-10"
            />
          </div>
        ) : null}
        {def.filters.map((f) => (
          <Select
            key={f.name}
            aria-label={f.label}
            value={filters[f.name] ?? ''}
            onChange={(e) => navigate({ [`f_${f.name}`]: e.target.value, page: '' })}
            className="w-auto min-w-44"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ))}
        {canWrite ? (
          <Button variant="primary" className="ml-auto" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {article} {def.singular}
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filtered ? 'Sin resultados' : def.empty.title}
            description={
              filtered
                ? 'Ningún registro coincide con los filtros. Prueba con otra búsqueda.'
                : def.empty.description
            }
            action={
              canWrite && !filtered ? (
                <Button variant="primary" onClick={() => setEditing('new')}>
                  <Plus aria-hidden />
                  {article} {def.singular}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table aria-label={def.plural}>
              <THead>
                <tr>
                  {isActivities ? (
                    <TH className="w-12">
                      <span className="sr-only">Hecha</span>
                    </TH>
                  ) : null}
                  {def.columns.map((c) => (
                    <TH key={c.path}>{c.label}</TH>
                  ))}
                  <TH className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((row) => (
                  <TR
                    key={row.id as string}
                    className={isActivities && row.done_at ? 'opacity-55' : ''}
                  >
                    {isActivities ? (
                      <TD>
                        <input
                          type="checkbox"
                          checked={Boolean(row.done_at)}
                          disabled={!canWrite}
                          onChange={() => void toggleDone(row)}
                          aria-label={`Marcar como ${row.done_at ? 'pendiente' : 'hecha'}: ${row.subject as string}`}
                          className="size-4 accent-[var(--gold-primary)]"
                        />
                      </TD>
                    ) : null}
                    {def.columns.map((c, i) => (
                      <TD key={c.path} className={i === 0 ? 'font-medium' : 'text-muted'}>
                        {i === 0 && def.detail ? (
                          <Link
                            href={`${def.detail}/${row.id as string}`}
                            className="text-gold underline-offset-4 hover:underline"
                          >
                            <Cell col={c} row={row} />
                          </Link>
                        ) : (
                          <Cell col={c} row={row} />
                        )}
                      </TD>
                    ))}
                    <TD>
                      {canWrite || canDelete ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Acciones">
                              <MoreHorizontal aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-52">
                            {def.key === 'compliance_documents' &&
                            canWrite &&
                            row.status === 'draft' ? (
                              <DropdownMenuItem onSelect={() => void documentAction(row, 'submit')}>
                                <Send aria-hidden />
                                Enviar a revisión
                              </DropdownMenuItem>
                            ) : null}
                            {def.key === 'compliance_documents' &&
                            canApprove &&
                            row.status === 'in_review' ? (
                              <DropdownMenuItem
                                onSelect={() => void documentAction(row, 'approve')}
                              >
                                <Check aria-hidden />
                                Aprobar documento
                              </DropdownMenuItem>
                            ) : null}
                            {canWrite ? (
                              <DropdownMenuItem onSelect={() => setEditing(row)}>
                                <Pencil aria-hidden />
                                Editar
                              </DropdownMenuItem>
                            ) : null}
                            {canDelete ? (
                              <DropdownMenuItem danger onSelect={() => setRemoving(row)}>
                                <Trash2 aria-hidden />
                                Eliminar
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <p className="tabular" aria-live="polite">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => navigate({ page: String(page - 1) })}
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
                onClick={() => navigate({ page: String(page + 1) })}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <EntityFormDialog
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : String(editing.id)}
        def={def}
        row={editing === 'new' ? null : editing}
        open={editing !== null}
        relations={relations}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast.success('Guardado');
          router.refresh();
        }}
        save={(id, values) => saveRow(def.key, id, values)}
      />

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent
          title={`¿Eliminar ${def.isFeminine ? 'esta' : 'este'} ${def.singular}?`}
          description={
            def.key === 'accounts'
              ? 'La empresa dejará de aparecer en las listas. Sus contactos y oportunidades se conservan.'
              : 'Esta acción no se puede deshacer.'
          }
          confirmLabel="Eliminar"
          loading={busy}
          onConfirm={() => void confirmDelete()}
        />
      </AlertDialog>
    </div>
  );
}
