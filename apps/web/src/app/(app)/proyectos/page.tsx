import type { Metadata } from 'next';
import { EntityPage } from '@/components/entities/entity-page';

export const metadata: Metadata = { title: 'Proyectos' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <EntityPage
      entityKey="projects"
      group="Administración"
      title="Proyectos"
      description="Agrupa el trabajo del equipo con responsable, fechas y estado. Las tareas se ligan a un proyecto."
      searchParams={await searchParams}
    />
  );
}
