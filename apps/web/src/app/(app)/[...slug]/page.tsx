import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { COMING_SOON_LABEL, canSee, findNavItem } from '@/lib/nav';
import { getSessionUser } from '@/lib/session';

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: findNavItem(`/${slug.join('/')}`)?.item.label ?? 'No encontrado' };
}

/** Modules that are listed in the navigation but not built yet render an honest status page. */
export default async function ModulePlaceholder({ params }: Props) {
  const { slug } = await params;
  const hit = findNavItem(`/${slug.join('/')}`);
  const user = await getSessionUser();
  if (!hit || hit.item.status === 'live' || !user) notFound();
  const { item, group } = hit;

  if (!canSee(item, user)) {
    return (
      <Card className="animate-fade-up mx-auto mt-10 max-w-xl">
        <EmptyState
          icon={Lock}
          title="No tienes acceso a este módulo"
          description="Tu rol no incluye este módulo. Si lo necesitas, pide a un administrador que revise tus permisos."
          action={
            <Button asChild variant="secondary">
              <Link href="/">Volver al inicio</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const Icon = item.icon;
  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-8">
      <header className="grid gap-2">
        <p className="text-sm text-muted">{group.label}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">{item.label}</h1>
      </header>
      <Card>
        <EmptyState
          icon={Icon}
          title="Este módulo estará disponible pronto"
          description="Todavía no está construido, y no mostramos pantallas simuladas. Cuando esté listo guardará datos reales y respetará los permisos de tu rol."
          action={<Badge tone="gold">{COMING_SOON_LABEL}</Badge>}
        />
      </Card>
    </div>
  );
}
