'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { moveOpportunity, saveRow } from '@/app/actions/entities';
import { EntityFormDialog } from '@/components/entities/entity-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { ENTITIES, type Option, type RelationKey } from '@/lib/entities';
import { formatDay, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface Stage {
  id: string;
  name: string;
  kind: 'open' | 'won' | 'lost';
  probability: number;
}
export interface Opp {
  id: string;
  title: string;
  stage_id: string;
  amount: number;
  expected_close: string | null;
  account: { name: string } | null;
  owner: { name: string } | null;
}

const tone = { open: 'border-line', won: 'border-success/40', lost: 'border-danger/30' } as const;

/**
 * Board by stage. Moving a card uses a select (works with keyboard and screen readers and on a phone);
 * the database decides who may move it.
 */
export function PipelineBoard({
  stages,
  opps,
  relations,
  canWrite,
}: {
  stages: Stage[];
  opps: Opp[];
  relations: Partial<Record<RelationKey, Option[]>>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const def = ENTITIES.opportunities;
  const [editing, setEditing] = useState<{ row: Opp | null; stageId?: string } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const m = new Map<string, Opp[]>();
    for (const s of stages) m.set(s.id, []);
    for (const o of opps) m.get(o.stage_id)?.push(o);
    return m;
  }, [stages, opps]);

  async function move(opp: Opp, stageId: string) {
    setMoving(opp.id);
    const res = await moveOpportunity(opp.id, stageId);
    setMoving(null);
    if (!res.ok) return void toast.error(res.error ?? 'No se pudo mover.');
    router.refresh();
  }

  return (
    <>
      <div
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6"
        role="list"
        aria-label="Etapas del pipeline"
      >
        {stages.map((stage) => {
          const items = byStage.get(stage.id) ?? [];
          const sum = items.reduce((t, o) => t + Number(o.amount), 0);
          return (
            <section
              key={stage.id}
              role="listitem"
              aria-label={stage.name}
              className="flex w-72 shrink-0 flex-col rounded-panel border border-line bg-surface/60"
            >
              <header className="flex items-start justify-between gap-2 border-b border-line p-3.5">
                <div className="grid gap-0.5">
                  <h2 className="text-sm font-semibold text-fg">{stage.name}</h2>
                  <p className="tabular text-xs text-muted">
                    {items.length} · {formatMoney(sum)}
                  </p>
                </div>
                {canWrite ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Nueva oportunidad en ${stage.name}`}
                    onClick={() => setEditing({ row: null, stageId: stage.id })}
                  >
                    <Plus aria-hidden />
                  </Button>
                ) : null}
              </header>
              <ul className="grid min-h-24 content-start gap-2.5 p-2.5">
                {items.length === 0 ? (
                  <li className="grid place-items-center px-3 py-6 text-center text-xs text-faint">
                    Sin oportunidades
                  </li>
                ) : null}
                {items.map((o) => (
                  <li
                    key={o.id}
                    className={cn(
                      'grid gap-2.5 rounded-control border bg-surface-2 p-3 transition-opacity',
                      tone[stage.kind],
                      moving === o.id && 'opacity-50',
                    )}
                  >
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => setEditing({ row: o })}
                      className="grid gap-1 text-left disabled:cursor-default"
                    >
                      <span className="text-sm font-medium text-fg">{o.title}</span>
                      <span className="text-[0.8125rem] text-muted">{o.account?.name ?? '—'}</span>
                    </button>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="gold" className="tabular">
                        {formatMoney(o.amount)}
                      </Badge>
                      {o.expected_close ? (
                        <span className="tabular inline-flex items-center gap-1 text-xs text-muted">
                          <CalendarDays className="size-3.5" aria-hidden />
                          {formatDay(o.expected_close)}
                        </span>
                      ) : null}
                    </div>
                    {o.owner ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <UserRound className="size-3.5" aria-hidden />
                        {o.owner.name}
                      </span>
                    ) : null}
                    {canWrite ? (
                      <Select
                        aria-label={`Mover ${o.title} a otra etapa`}
                        value={o.stage_id}
                        onChange={(e) => void move(o, e.target.value)}
                        className="h-8 text-xs"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <EntityFormDialog
        key={editing ? `${editing.row?.id ?? 'new'}-${editing.stageId ?? ''}` : 'closed'}
        def={def}
        row={editing?.row ? (editing.row as unknown as Record<string, unknown>) : null}
        preset={editing?.stageId ? { stage_id: editing.stageId } : undefined}
        open={editing !== null}
        relations={relations}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast.success('Guardado');
          router.refresh();
        }}
        save={(id, values) => saveRow('opportunities', id, values)}
      />
    </>
  );
}
