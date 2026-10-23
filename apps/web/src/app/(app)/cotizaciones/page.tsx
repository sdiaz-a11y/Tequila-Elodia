import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Cotizaciones' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="quotes"
      group="Comercial"
      title="Cotizaciones"
      description="Presupuestos para tus empresas. Cada línea guarda el precio, el descuento y el impuesto del momento. Al aceptarse, se convierten en pedido."
      searchParams={await searchParams}
    />
  );
}
