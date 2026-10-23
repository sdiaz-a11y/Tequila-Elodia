'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteRow, saveRow } from '@/app/actions/entities';
import { AssetThumb } from '@/components/content/asset-thumb';
import { ReviewActions } from '@/components/content/review-actions';
import { EntityFormDialog } from '@/components/entities/entity-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CHANNELS,
  FORMATS,
  STATUS_LABELS,
  STATUS_TONE,
  label,
  type ContentItem,
} from '@/lib/content';
import { MONTH_NAMES, WEEKDAYS, dayKey, monthKey, shiftMonth } from '@/lib/calendar';
import { ENTITIES, localToIso, type Option, type RelationKey } from '@/lib/entities';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const dot: Record<string, string> = {
  idea: 'bg-faint',
  draft: 'bg-muted',
  in_review: 'bg-warning',
  approved: 'bg-success',
  rejected: 'bg-danger',
  published: 'bg-gold',
};

export function CalendarView({
  year,
  month,
  days,
  items,
  unscheduled,
  urls,
  relations,
  today,
  canEdit,
  canApprove,
}: {
  year: number;
  month: number;
  days: string[];
  items: ContentItem[];
  unscheduled: ContentItem[];
  urls: Record<string, string>;
  relations: Partial<Record<RelationKey, Option[]>>;
  today: string;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<{ row: ContentItem | null; day?: string } | null>(null);
  const [removing, setRemoving] = useState<ContentItem | null>(null);
  const [busy, setBusy] = useState(false);

  const byDay = useMemo(() => {
    const m = new Map<string, ContentItem[]>();
    for (const it of items) {
      if (!it.scheduled_at) continue;
      const k = dayKey(it.scheduled_at);
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return m;
  }, [items]);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const refresh = () => {
    setOpen(null);
    router.refresh();
  };

  async function confirmDelete() {
    if (!removing) return;
    setBusy(true);
    const res = await deleteRow('content_items', removing.id);
    setBusy(false);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo eliminar.');
    toast.success('Contenido eliminado');
    setRemoving(null);
    setOpen(null);
    router.refresh();
  }

  const canDelete = (it: ContentItem) =>
    canApprove || (canEdit && (it.status === 'idea' || it.status === 'draft'));

  const chip = (it: ContentItem) => (
    <button
      key={it.id}
      type="button"
      onClick={() => setOpen(it)}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-1.5 py-1 text-left text-[0.6875rem] leading-tight text-fg transition-colors hover:border-line-strong"
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', dot[it.status])} aria-hidden />
      <span className="truncate">{it.title}</span>
      <span className="sr-only">{STATUS_LABELS[it.status]}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Mes anterior">
            <Link href={`/calendario?mes=${monthKey(prev.year, prev.month)}`}>
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
          <h2 className="min-w-44 text-center font-display text-2xl font-semibold capitalize text-fg">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente">
            <Link href={`/calendario?mes=${monthKey(next.year, next.month)}`}>
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/calendario">Hoy</Link>
        </Button>
        <ul
          className="hidden items-center gap-3 text-xs text-muted lg:flex"
          aria-label="Leyenda de estados"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', dot[k])} aria-hidden />
              {v}
            </li>
          ))}
        </ul>
        {canEdit ? (
          <Button variant="primary" className="ml-auto" onClick={() => setForm({ row: null })}>
            <Plus aria-hidden />
            Nuevo contenido
          </Button>
        ) : null}
      </div>

      {/* Desktop and tablet: month grid */}
      <div
        className="hidden overflow-hidden rounded-panel border border-line bg-surface md:block"
        role="grid"
        aria-label={`Calendario de ${MONTH_NAMES[month - 1]} ${year}`}
      >
        <div
          className="grid grid-cols-7 border-b border-line text-center text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-faint"
          role="row"
        >
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2.5" role="columnheader">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = Number(d.slice(5, 7)) === month;
            const list = byDay.get(d) ?? [];
            return (
              <div
                key={d}
                role="gridcell"
                className={cn(
                  'group min-h-28 border-b border-r border-line/60 p-1.5',
                  i % 7 === 6 && 'border-r-0',
                  i >= 35 && 'border-b-0',
                  !inMonth && 'bg-background/40',
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'tabular grid size-6 place-items-center rounded-full text-xs',
                      d === today
                        ? 'bg-gold font-semibold text-background'
                        : inMonth
                          ? 'text-muted'
                          : 'text-faint/60',
                    )}
                  >
                    {Number(d.slice(8, 10))}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      aria-label={`Nuevo contenido el ${d}`}
                      onClick={() => setForm({ row: null, day: d })}
                      className="grid size-6 place-items-center rounded-full text-faint opacity-0 transition-opacity hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-1">
                  {list.slice(0, 3).map(chip)}
                  {list.length > 3 ? (
                    <p className="px-1 text-[0.6875rem] text-muted">+{list.length - 3} más</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone: agenda by day (a 7-column grid does not fit) */}
      <div className="grid gap-3 md:hidden">
        {days
          .filter((d) => Number(d.slice(5, 7)) === month && (byDay.get(d)?.length ?? 0) > 0)
          .map((d) => (
            <section
              key={d}
              aria-label={d}
              className="rounded-panel border border-line bg-surface p-3"
            >
              <h3
                className={cn(
                  'mb-2 text-sm font-semibold first-letter:uppercase',
                  d === today ? 'text-gold' : 'text-fg',
                )}
              >
                {new Intl.DateTimeFormat('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  timeZone: 'UTC',
                }).format(new Date(`${d}T12:00:00Z`))}
              </h3>
              <div className="grid gap-1.5">{byDay.get(d)!.map(chip)}</div>
            </section>
          ))}
        {items.filter((i) => i.scheduled_at && Number(dayKey(i.scheduled_at).slice(5, 7)) === month)
          .length === 0 ? (
          <p className="rounded-panel border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
            Sin contenido programado este mes.
          </p>
        ) : null}
      </div>

      {unscheduled.length ? (
        <section
          aria-label="Sin fecha"
          className="grid gap-3 rounded-panel border border-line bg-surface p-4"
        >
          <h3 className="text-sm font-semibold text-fg">Sin fecha asignada</h3>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{unscheduled.map(chip)}</div>
        </section>
      ) : null}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="top-[6vh] max-h-[88vh] w-[min(94vw,38rem)] overflow-y-auto">
          {open ? (
            <div className="grid gap-5 p-6">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[open.status]}>{STATUS_LABELS[open.status]}</Badge>
                  <Badge>{label(CHANNELS, open.channel)}</Badge>
                  <Badge>{label(FORMATS, open.format)}</Badge>
                </div>
                <DialogTitle className="text-lg font-semibold text-fg">{open.title}</DialogTitle>
                <DialogDescription className="tabular text-sm text-muted">
                  {open.scheduled_at ? formatDateTime(open.scheduled_at) : 'Sin fecha'}
                  {open.owner ? ` · ${open.owner.name}` : ''}
                </DialogDescription>
              </div>

              {open.asset ? (
                <div className="grid gap-1.5">
                  <AssetThumb
                    mime={open.asset.mime}
                    url={urls[open.asset.storage_path]}
                    title={open.asset.title}
                  />
                  <p className="text-xs text-muted">{open.asset.title}</p>
                </div>
              ) : null}
              {open.copy ? (
                <p className="whitespace-pre-wrap rounded-control border border-line bg-surface-2 p-3.5 text-sm leading-relaxed text-fg">
                  {open.copy}
                </p>
              ) : null}
              {open.notes ? (
                <p className="whitespace-pre-wrap text-sm text-muted">
                  <span className="text-faint">Notas: </span>
                  {open.notes}
                </p>
              ) : null}
              {open.review_comment ? (
                <p
                  className={cn(
                    'rounded-control border px-3.5 py-3 text-sm',
                    open.status === 'rejected'
                      ? 'border-danger/30 bg-danger/10 text-danger'
                      : 'border-line bg-surface-2 text-muted',
                  )}
                >
                  <span className="font-medium">
                    {open.status === 'rejected'
                      ? 'Motivo del rechazo: '
                      : 'Comentario de revisión: '}
                  </span>
                  {open.review_comment}
                </p>
              ) : null}
              {open.status === 'approved' || open.status === 'published' ? (
                <p className="text-xs text-muted">
                  Aprobado con revisión de normativa confirmada
                  {open.reviewed_at ? ` el ${formatDateTime(open.reviewed_at)}` : ''}. Si lo editas,
                  vuelve a revisión.
                </p>
              ) : null}

              <ReviewActions
                item={open}
                canEdit={canEdit}
                canApprove={canApprove}
                onDone={refresh}
              />

              {canEdit || canDelete(open) ? (
                <div className="flex justify-between gap-2 border-t border-line pt-4">
                  {canDelete(open) ? (
                    <Button
                      variant="ghost"
                      onClick={() => setRemoving(open)}
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 aria-hidden />
                      Eliminar
                    </Button>
                  ) : (
                    <span />
                  )}
                  {canEdit ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setForm({ row: open });
                        setOpen(null);
                      }}
                    >
                      <Pencil aria-hidden />
                      Editar
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <EntityFormDialog
        key={form ? `${form.row?.id ?? 'new'}-${form.day ?? ''}` : 'closed'}
        def={ENTITIES.content_items}
        row={form?.row ? (form.row as unknown as Record<string, unknown>) : null}
        preset={form?.day ? { scheduled_at: localToIso(`${form.day}T10:00`) } : undefined}
        open={form !== null}
        relations={relations}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          toast.success('Guardado');
          router.refresh();
        }}
        save={(id, values) => saveRow('content_items', id, values)}
      />

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent
          title="¿Eliminar este contenido?"
          description="Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          loading={busy}
          onConfirm={() => void confirmDelete()}
        />
      </AlertDialog>
    </div>
  );
}
