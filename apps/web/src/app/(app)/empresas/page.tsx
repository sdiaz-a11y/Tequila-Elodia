import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Empresas y prospectos' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="accounts"
      group="Comercial"
      title="Empresas y prospectos"
      description="Todas las empresas con las que trabajas o quieres trabajar: prospectos, clientes, distribuidores y aliados."
      searchParams={await searchParams}
    />
  );
}
