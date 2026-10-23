import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Planeación estratégica' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="objectives"
      group="Dirección"
      title="Planeación estratégica"
      description="Lo que quieres lograr, con una meta numérica y una fecha. Registra el avance y la plataforma conserva el historial."
      searchParams={await searchParams}
    />
  );
}
