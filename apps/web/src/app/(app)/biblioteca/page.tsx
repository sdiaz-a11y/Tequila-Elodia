import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { ASSET_KINDS, type Asset } from '@/lib/content';
import { canApprove, canContent, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { withSignedUrls } from '@/lib/signed-urls';
import { createSupabase } from '@/lib/supabase/server';
import { MediaLibrary } from './media-library';

export const metadata: Metadata = { title: 'Biblioteca multimedia' };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const sp = await searchParams;
  const kind = ASSET_KINDS.some((k) => k.value === sp.tipo) ? (sp.tipo as string) : '';
  const q = (sp.q ?? '')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .trim();

  const supabase = await createSupabase();
  let query = supabase
    .from('brand_assets')
    .select('*')
    .order('official', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (kind) query = query.eq('kind', kind);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  const { data } = await query;
  const assets = (await withSignedUrls(supabase, (data ?? []) as Asset[])) as Asset[];

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Marketing</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Biblioteca multimedia
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Fotografías, videos, logotipos y documentos de la marca. Los marcados como oficiales no se
          alteran ni se sustituyen.
        </p>
      </header>
      <MediaLibrary
        assets={assets}
        kind={kind}
        q={q}
        canEdit={canContent(user)}
        canApprove={canApprove(user)}
      />
    </div>
  );
}
