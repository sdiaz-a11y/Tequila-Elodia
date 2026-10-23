import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Configuración' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="pipeline_stages"
      group="Sistema"
      title="Configuración"
      description="Las etapas por las que avanza una oportunidad en el pipeline. Cámbialas cuando el negocio defina las suyas: no se pueden quitar las que ya tienen oportunidades."
      searchParams={await searchParams}
    />
  );
}
