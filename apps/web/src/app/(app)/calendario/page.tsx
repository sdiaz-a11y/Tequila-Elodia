import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { dayKey, gridRange, monthGrid, parseMonth } from '@/lib/calendar';
import type { ContentItem } from '@/lib/content';
import { ENTITIES } from '@/lib/entities';
import { loadRelations, relationKeysOf } from '@/lib/entity-data';
import { canApprove, canContent, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { withSignedUrls } from '@/lib/signed-urls';
import { createSupabase } from '@/lib/supabase/server';
import { CalendarView } from './calendar-view';

export const metadata: Metadata = { title: 'Calendario editorial' };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const { mes } = await searchParams;
  const { year, month } = parseMonth(mes);
  const days = monthGrid(year, month);
  const range = gridRange(days);
  const select = ENTITIES.content_items.select;

  const supabase = await createSupabase();
  const [scheduled, loose, relations] = await Promise.all([
    supabase
      .from('content_items')
      .select(select)
      .gte('scheduled_at', range.from)
      .lt('scheduled_at', range.to)
      .order('scheduled_at'),
    supabase
      .from('content_items')
      .select(select)
      .is('scheduled_at', null)
      .order('created_at', { ascending: false })
      .limit(60),
    loadRelations(supabase, relationKeysOf(ENTITIES.content_items)),
  ]);
  const items = (scheduled.data ?? []) as unknown as ContentItem[];
  const unscheduled = (loose.data ?? []) as unknown as ContentItem[];

  const assets = [...items, ...unscheduled].flatMap((i) =>
    i.asset ? [{ storage_path: i.asset.storage_path }] : [],
  );
  const signed = await withSignedUrls(supabase, [
    ...new Map(assets.map((a) => [a.storage_path, a])).values(),
  ]);
  const urls = Object.fromEntries(signed.flatMap((s) => (s.url ? [[s.storage_path, s.url]] : [])));

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Marketing</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Calendario editorial
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Planea qué se publica, dónde y cuándo. Cada pieza pasa por revisión y aprobación antes de
          salir.
        </p>
      </header>
      <CalendarView
        year={year}
        month={month}
        days={days}
        items={items}
        unscheduled={unscheduled}
        urls={urls}
        relations={relations}
        today={dayKey(new Date().toISOString())}
        canEdit={canContent(user)}
        canApprove={canApprove(user)}
      />
    </div>
  );
}
