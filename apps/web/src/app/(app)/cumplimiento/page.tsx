import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Documentación y cumplimiento' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="compliance_documents"
      group="Operaciones"
      title="Documentación y cumplimiento"
      description="Permisos, certificados y contratos con su fecha de vencimiento. ELODIA OS no declara que algo cumple la ley: una persona autorizada revisa y aprueba cada documento."
      searchParams={await searchParams}
    />
  );
}
