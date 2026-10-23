import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { dayKey } from '@/lib/calendar';
import { ENTITIES } from '@/lib/entities';
import { loadRelations, relationKeysOf } from '@/lib/entity-data';
import { canManage, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { TaskBoard, type Task } from './task-board';

export const metadata: Metadata = { title: 'Tareas' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const sp = await searchParams;
  const projectId = sp.proyecto && UUID.test(sp.proyecto) ? sp.proyecto : '';
  const mine = sp.mias === '1';

  const supabase = await createSupabase();
  let q = supabase
    .from('tasks')
    .select(ENTITIES.tasks.select)
    .order('due_on', { ascending: true, nullsFirst: false })
    .limit(500);
  if (projectId) q = q.eq('project_id', projectId);
  if (mine) q = q.eq('assignee_id', user.id);
  const [{ data }, relations] = await Promise.all([
    q,
    loadRelations(supabase, relationKeysOf(ENTITIES.tasks)),
  ]);

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Administración</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Tareas</h1>
        <p className="max-w-2xl text-sm text-muted">
          Lo que hay que hacer, quién lo hace y para cuándo. Mueve cada tarea de estado conforme
          avanza.
        </p>
      </header>
      <TaskBoard
        tasks={(data ?? []) as unknown as Task[]}
        relations={relations}
        projectId={projectId}
        mine={mine}
        today={dayKey(new Date().toISOString())}
        canDelete={canManage(user)}
      />
    </div>
  );
}
