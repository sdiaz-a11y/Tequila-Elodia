import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { canAdmin, canRead } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { AutomationList, type Automation } from './automation-list';

export const metadata: Metadata = { title: 'Automatizaciones' };

export default async function AutomationsPage() {
  const user = await getSessionUser();
  if (!user || !canRead(user)) return <AccessDenied />;
  const supabase = await createSupabase();
  const { data } = await supabase
    .from('automation_settings')
    .select('key,title,description,enabled')
    .order('key');
  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Inteligencia</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Automatizaciones
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Tareas que la plataforma hace sola. Todas empiezan apagadas; solo dirección y
          administración las encienden. Cada una se ejecuta una sola vez por evento, sin duplicarse.
          {canAdmin(user) ? '' : ' Tu rol puede verlas pero no cambiarlas.'}
        </p>
      </header>
      <AutomationList items={(data ?? []) as Automation[]} canEdit={canAdmin(user)} />
    </div>
  );
}
