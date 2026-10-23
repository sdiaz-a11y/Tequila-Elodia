import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Lotes' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="lots"
      group="Operaciones"
      title="Lotes"
      description="Cada lote de producción con su código, fecha y caducidad, para rastrear de dónde sale cada entrada."
      searchParams={await searchParams}
    />
  );
}
