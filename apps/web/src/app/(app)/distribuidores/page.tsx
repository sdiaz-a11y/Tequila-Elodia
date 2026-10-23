import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Distribuidores' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="distributors"
      group="Comercial"
      title="Distribuidores"
      description="Tu red de distribución: estado de la negociación, territorio, exclusividad y contrato."
      searchParams={await searchParams}
    />
  );
}
