import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { ENTITIES } from '@/lib/entities';
import { loadRelations, relationKeysOf } from '@/lib/entity-data';
import { formatMoney } from '@/lib/format';
import { canRead, canWrite } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { PipelineBoard, type Opp, type Stage } from './pipeline-board';

export const metadata: Metadata = { title: 'Pipeline' };

export default async function PipelinePage() {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const supabase = await createSupabase();
  const [stages, opps, relations] = await Promise.all([
    supabase.from('pipeline_stages').select('id,name,kind,probability').order('position'),
    supabase
      .from('opportunities')
      .select(
        'id,title,stage_id,amount,expected_close,account:accounts!account_id(name),owner:profiles!owner_id(name)',
      )
      .order('created_at', { ascending: false })
      .limit(500),
    loadRelations(supabase, relationKeysOf(ENTITIES.opportunities)),
  ]);
  const list = (opps.data ?? []) as unknown as Opp[];
  const stageList = (stages.data ?? []) as Stage[];
  const kindOf = new Map(stageList.map((s) => [s.id, s.kind]));
  const open = list.filter((o) => kindOf.get(o.stage_id) === 'open');
  const openValue = open.reduce((t, o) => t + Number(o.amount), 0);

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Comercial</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Pipeline</h1>
        <p className="max-w-2xl text-sm text-muted">
          Cada oportunidad avanza por etapas hasta cerrarse.{' '}
          <span className="tabular text-fg">
            {open.length} abiertas · {formatMoney(openValue)} en juego
          </span>
          .
        </p>
      </header>
      <PipelineBoard
        stages={stageList}
        opps={list}
        relations={relations}
        canWrite={canWrite(user)}
      />
    </div>
  );
}
