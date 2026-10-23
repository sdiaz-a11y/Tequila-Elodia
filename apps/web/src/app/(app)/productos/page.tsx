import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Productos' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="products"
      group="Operaciones"
      title="Productos"
      description="El catálogo de productos de ELODIA. Cada producto tiene una o varias presentaciones con su SKU."
      searchParams={await searchParams}
    />
  );
}
