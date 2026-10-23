'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { deleteRow, moveTask, saveRow } from '@/app/actions/entities';
import { EntityFormDialog } from '@/components/entities/entity-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent } from '@/components/ui/dialog';
import { Select } from '@/components/ui/field';
import {
  ENTITIES,
  TASK_PRIORITY,
  TASK_STATUS,
  type Option,
  type RelationKey,
} from '@/lib/entities';
import { formatDay } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_on: string | null;
  project_id: string | null;
  assignee_id: string | null;
  description: string | null;
  project: { name: string } | null;
  assignee: { name: string } | null;
}

const prioTone = { low: 'neutral', medium: 'neutral', high: 'warning', urgent: 'danger' } as const;
const label = (list: readonly Option[], v: string) => list.find((o) => o.value === v)?.label ?? v;

export function TaskBoard({
  tasks,
  relations,
  projectId,
  mine,
  today,
  canDelete,
}: {
  tasks: Task[];
  relations: Partial<Record<RelationKey, Option[]>>;
  projectId: string;
  mine: boolean;
  today: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const def = ENTITIES.tasks;
  const [form, setForm] = useState<{ row: Task | null; status?: string } | null>(null);
  const [removing, setRemoving] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const m = new Map<string, Task[]>(TASK_STATUS.map((s) => [s.value, []]));
    for (const t of tasks) m.get(t.status)?.push(t);
    return m;
  }, [tasks]);

  const navigate = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next}`);
  };

  async function move(t: Task, status: string) {
    setMoving(t.id);
    const res = await moveTask(t.id, status);
    setMoving(null);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo mover.');
    router.refresh();
  }

  async function confirmDelete() {
    if (!removing) return;
    setBusy(true);
    const res = await deleteRow('tasks', removing.id);
    setBusy(false);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo eliminar.');
    toast.success('Tarea eliminada');
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Filtrar por proyecto"
          value={projectId}
          onChange={(e) => navigate({ proyecto: e.target.value })}
          className="w-auto min-w-48"
        >
          <option value="">Todos los proyectos</option>
          {(relations.projects ?? []).map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <label className="flex min-h-11 items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => navigate({ mias: e.target.checked ? '1' : '' })}
            className="size-4 accent-[var(--gold-primary)]"
          />
          Solo mis tareas
        </label>
        <Button variant="primary" className="ml-auto" onClick={() => setForm({ row: null })}>
          <Plus aria-hidden />
          Nueva tarea
        </Button>
      </div>

      <div
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6"
        role="list"
        aria-label="Estados de las tareas"
      >
        {TASK_STATUS.map((s) => {
          const items = byStatus.get(s.value) ?? [];
          return (
            <section
              key={s.value}
              role="listitem"
              aria-label={s.label}
              className="flex w-72 shrink-0 flex-col rounded-panel border border-line bg-surface/60"
            >
              <header className="flex items-center justify-between gap-2 border-b border-line p-3.5">
                <h2 className="text-sm font-semibold text-fg">
                  {s.label}{' '}
                  <span className="tabular ml-1 font-normal text-muted">{items.length}</span>
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Nueva tarea en ${s.label}`}
                  onClick={() => setForm({ row: null, status: s.value })}
                >
                  <Plus aria-hidden />
                </Button>
              </header>
              <ul className="grid min-h-24 content-start gap-2.5 p-2.5">
                {items.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-faint">Sin tareas</li>
                ) : null}
                {items.map((t) => {
                  const late = t.due_on && t.status !== 'done' && t.due_on < today;
                  return (
                    <li
                      key={t.id}
                      className={cn(
                        'grid gap-2.5 rounded-control border border-line bg-surface-2 p-3',
                        moving === t.id && 'opacity-50',
                        t.status === 'done' && 'opacity-70',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setForm({ row: t })}
                        className="grid gap-1 text-left"
                      >
                        <span
                          className={cn(
                            'text-sm font-medium text-fg',
                            t.status === 'done' && 'line-through',
                          )}
                        >
                          {t.title}
                        </span>
                        {t.project ? (
                          <span className="text-[0.8125rem] text-muted">{t.project.name}</span>
                        ) : null}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={prioTone[t.priority as keyof typeof prioTone] ?? 'neutral'}>
                          {label(TASK_PRIORITY, t.priority)}
                        </Badge>
                        {t.due_on ? (
                          <span
                            className={cn(
                              'tabular inline-flex items-center gap-1 text-xs',
                              late ? 'text-danger' : 'text-muted',
                            )}
                          >
                            <CalendarDays className="size-3.5" aria-hidden />
                            {formatDay(t.due_on)}
                            {late ? ' · vencida' : ''}
                          </span>
                        ) : null}
                      </div>
                      {t.assignee ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <UserRound className="size-3.5" aria-hidden />
                          {t.assignee.name}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Mover ${t.title} a otro estado`}
                          value={t.status}
                          onChange={(e) => void move(t, e.target.value)}
                          className="h-8 text-xs"
                        >
                          {TASK_STATUS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${t.title}`}
                            onClick={() => setRemoving(t)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <EntityFormDialog
        key={form ? `${form.row?.id ?? 'new'}-${form.status ?? ''}` : 'closed'}
        def={def}
        row={form?.row ? (form.row as unknown as Record<string, unknown>) : null}
        preset={{
          ...(form?.status ? { status: form.status } : {}),
          ...(projectId ? { project_id: projectId } : {}),
        }}
        open={form !== null}
        relations={relations}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          toast.success('Guardado');
          router.refresh();
        }}
        save={(id, values) => saveRow('tasks', id, values)}
      />

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent
          title="¿Eliminar esta tarea?"
          description="Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          loading={busy}
          onConfirm={() => void confirmDelete()}
        />
      </AlertDialog>
    </div>
  );
}
