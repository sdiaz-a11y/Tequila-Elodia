import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Contactos' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="contacts"
      group="Comercial"
      title="Contactos"
      description="Las personas de cada empresa: a quién llamar, su puesto y cómo localizarlas."
      searchParams={await searchParams}
    />
  );
}
