import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Presentaciones y SKU' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="variants"
      group="Operaciones"
      title="Presentaciones y SKU"
      description="Cada presentación con su SKU, volumen, graduación, precio y costo. Marca como verificados los datos que ya contrastaste con la etiqueta oficial."
      searchParams={await searchParams}
    />
  );
}
