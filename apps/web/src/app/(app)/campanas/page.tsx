import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Campañas' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="campaigns"
      group="Marketing"
      title="Campañas"
      description="Planea campañas con objetivo, presupuesto, gasto y resultados. Liga el contenido del calendario a cada campaña."
      searchParams={await searchParams}
    />
  );
}
