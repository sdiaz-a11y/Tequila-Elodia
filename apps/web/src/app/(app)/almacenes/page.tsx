import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Almacenes' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="warehouses"
      group="Operaciones"
      title="Almacenes"
      description="Los lugares donde guardas el producto. Marca uno como predeterminado para que los pedidos confirmados reserven ahí sus existencias."
      searchParams={await searchParams}
    />
  );
}
