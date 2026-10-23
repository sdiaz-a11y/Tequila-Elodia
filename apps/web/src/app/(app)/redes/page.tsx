import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Redes sociales' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="social_posts"
      group="Marketing"
      title="Redes sociales"
      description="Las piezas aprobadas en el calendario editorial. Registra el enlace de cada publicación y sus resultados (alcance e interacciones)."
      searchParams={await searchParams}
    />
  );
}
