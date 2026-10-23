import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Actividades' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="activities"
      group="Comercial"
      title="Actividades"
      description="Llamadas, reuniones y pendientes de seguimiento. Marca como hechas las que ya cerraste."
      searchParams={await searchParams}
    />
  );
}
