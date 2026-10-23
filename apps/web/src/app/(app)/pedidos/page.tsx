import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Pedidos' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="orders"
      group="Comercial"
      title="Pedidos"
      description="Lo que tus clientes compraron: estado de entrega, pagos y saldo pendiente."
      searchParams={await searchParams}
    />
  );
}
