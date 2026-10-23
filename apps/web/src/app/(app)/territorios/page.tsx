import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Territorios' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="territories"
      group="Comercial"
      title="Territorios"
      description="Los países, estados y ciudades donde operas o planeas expandir la marca."
      searchParams={await searchParams}
    />
  );
}
