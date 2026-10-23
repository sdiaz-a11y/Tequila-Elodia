import type { Metadata } from 'next';
import { ROLE_KEYS } from '@elodia/shared';
import { AccessDenied } from '@/components/ui/access-denied';
import { canAdmin } from '@/lib/roles';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { TeamPanel, type Member } from './team-panel';

export const metadata: Metadata = { title: 'Equipo' };

export default async function TeamPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const admin = canAdmin(user);
  if (
    !admin &&
    !user.roles.some((r) =>
      [
        'sales_manager',
        'salesperson',
        'marketing',
        'operations',
        'finance',
        'collaborator',
      ].includes(r),
    )
  )
    return <AccessDenied />;

  const supabase = await createSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('id,email,name,role,active,created_at')
    .order('name');
  const elevated = ['tech_superadmin', 'director_vp'];
  const assignable = ROLE_KEYS.filter(
    (r) =>
      !elevated.includes(r) || user.roles.includes('tech_superadmin') || user.roles.includes(r),
  );

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Administración</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Equipo</h1>
        <p className="max-w-2xl text-sm text-muted">
          Quién tiene acceso a ELODIA OS y con qué rol. Los cambios de rol aplican en la siguiente
          acción de cada persona.
        </p>
      </header>
      <TeamPanel
        members={(data ?? []) as Member[]}
        meId={user.id}
        assignable={[...assignable]}
        canEdit={admin}
      />
    </div>
  );
}
