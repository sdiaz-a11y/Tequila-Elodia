import { AccessDenied } from '@/components/ui/access-denied';
import { ENTITIES, type EntityKey } from '@/lib/entities';
import { listRows, loadRelations, parseListParams, relationKeysOf } from '@/lib/entity-data';
import { canManage, canRead, canWrite } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { EntityManager } from './entity-manager';

/** Standard list screen for one entity: header, search, filters, table, create/edit/delete. */
export async function EntityPage({
  entityKey,
  group,
  title,
  description,
  searchParams,
}: {
  entityKey: EntityKey;
  group: string;
  title: string;
  description: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const def = ENTITIES[entityKey];
  const params = parseListParams(def, searchParams);
  const supabase = await createSupabase();
  const [{ rows, total }, relations] = await Promise.all([
    listRows(supabase, def, params),
    loadRelations(supabase, relationKeysOf(def)),
  ]);

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">{group}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">{title}</h1>
        <p className="max-w-2xl text-sm text-muted">{description}</p>
      </header>
      <EntityManager
        def={def}
        rows={rows}
        total={total}
        page={params.page}
        q={params.q}
        filters={params.filters}
        relations={relations}
        canWrite={canWrite(user)}
        canDelete={canManage(user)}
      />
    </div>
  );
}
