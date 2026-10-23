import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';
import { AccessDenied } from '@/components/ui/access-denied';
import { EmptyState } from '@/components/ui/empty-state';
import type { ContentItem } from '@/lib/content';
import { ENTITIES } from '@/lib/entities';
import { canApprove, canContent, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { withSignedUrls } from '@/lib/signed-urls';
import { createSupabase } from '@/lib/supabase/server';
import { ApprovalsList } from './approvals-list';

export const metadata: Metadata = { title: 'Aprobaciones' };

const SECTIONS = [
  {
    status: 'in_review',
    title: 'Esperando revisión',
    hint: 'Piezas enviadas por el equipo. Quien aprueba confirma además la revisión de la normativa.',
  },
  {
    status: 'approved',
    title: 'Aprobadas, por publicar',
    hint: 'Listas para salir. Márcalas como publicadas cuando se suban.',
  },
  {
    status: 'rejected',
    title: 'Rechazadas',
    hint: 'Necesitan cambios antes de volver a revisión.',
  },
] as const;

export default async function ApprovalsPage() {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const supabase = await createSupabase();
  const { data } = await supabase
    .from('content_items')
    .select(ENTITIES.content_items.select)
    .in(
      'status',
      SECTIONS.map((s) => s.status),
    )
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(150);
  const items = (data ?? []) as unknown as ContentItem[];
  const signed = await withSignedUrls(supabase, [
    ...new Map(
      items.flatMap((i) =>
        i.asset ? [[i.asset.storage_path, { storage_path: i.asset.storage_path }] as const] : [],
      ),
    ).values(),
  ]);
  const urls = Object.fromEntries(signed.flatMap((s) => (s.url ? [[s.storage_path, s.url]] : [])));
  const approve = canApprove(user);

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-8">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Marketing</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Aprobaciones</h1>
        <p className="max-w-2xl text-sm text-muted">
          Nada se publica sin revisión humana.{' '}
          {approve
            ? 'Tú puedes aprobar o rechazar.'
            : 'Dirección o administración aprueban lo que envíes.'}
        </p>
      </header>
      {items.length === 0 ? (
        <div className="rounded-panel border border-line bg-surface">
          <EmptyState
            icon={ClipboardCheck}
            title="Nada pendiente"
            description="Cuando alguien envíe contenido a revisión aparecerá aquí."
          />
        </div>
      ) : (
        SECTIONS.map((s) => {
          const list = items.filter((i) => i.status === s.status);
          if (!list.length) return null;
          return (
            <section key={s.status} aria-label={s.title} className="grid gap-3">
              <div>
                <h2 className="text-base font-semibold text-fg">
                  {s.title}{' '}
                  <span className="tabular ml-1 text-sm font-normal text-muted">{list.length}</span>
                </h2>
                <p className="text-sm text-muted">{s.hint}</p>
              </div>
              <ApprovalsList
                items={list}
                urls={urls}
                canEdit={canContent(user)}
                canApprove={approve}
              />
            </section>
          );
        })
      )}
    </div>
  );
}
