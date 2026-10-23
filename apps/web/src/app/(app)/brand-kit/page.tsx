import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { AssetThumb } from '@/components/content/asset-thumb';
import { Badge } from '@/components/ui/badge';
import { AccessDenied } from '@/components/ui/access-denied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ASSET_KINDS, label, type Asset } from '@/lib/content';
import { canContent, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { withSignedUrls } from '@/lib/signed-urls';
import { createSupabase } from '@/lib/supabase/server';
import { BrandKitEditor, type Kit } from './brand-kit-editor';

export const metadata: Metadata = { title: 'Brand Kit' };

export default async function BrandKitPage() {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const supabase = await createSupabase();
  const [kitRes, assetsRes] = await Promise.all([
    supabase
      .from('brand_kit')
      .select('tone,approved_messages,restrictions,palette,fonts')
      .eq('id', 1)
      .single(),
    supabase.from('brand_assets').select('*').eq('official', true).order('created_at'),
  ]);
  const assets = (await withSignedUrls(supabase, (assetsRes.data ?? []) as Asset[])) as Asset[];
  const kit = (kitRes.data ?? {
    tone: '',
    approved_messages: '',
    restrictions: '',
    palette: [],
    fonts: [],
  }) as Kit;

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Marketing</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Brand Kit</h1>
        <p className="max-w-2xl text-sm text-muted">
          La identidad oficial de ELODIA en un solo lugar: colores, tipografías, tono, mensajes
          aprobados y recursos oficiales.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle>Recursos oficiales</CardTitle>
            <CardDescription>
              Imágenes aprobadas por la marca. No se modifican ni se sustituyen.
            </CardDescription>
          </div>
          <Link href="/biblioteca" className="text-sm text-gold underline-offset-4 hover:underline">
            Ver biblioteca completa
          </Link>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <EmptyState
              title="Aún no hay recursos oficiales"
              description="Sube el logotipo y las fotografías oficiales en la biblioteca y márcalos como oficiales."
              className="py-8"
            />
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {assets.map((a) => (
                <li key={a.id} className="grid gap-2">
                  <AssetThumb mime={a.mime} url={a.url} title={a.title} />
                  <p className="text-sm font-medium text-fg">{a.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="gold">
                      <ShieldCheck className="size-3" aria-hidden />
                      Oficial
                    </Badge>
                    <Badge>{label(ASSET_KINDS, a.kind)}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BrandKitEditor kit={kit} canEdit={canContent(user)} />
    </div>
  );
}
