import type { Metadata } from 'next';
import { ROLE_LABELS, type RoleKey } from '@elodia/shared';
import { AccessDenied } from '@/components/ui/access-denied';
import { getSessionUser } from '@/lib/session';
import { createSupabase } from '@/lib/supabase/server';
import { RoleMatrix } from './role-matrix';

export const metadata: Metadata = { title: 'Roles y permisos' };

const EDITABLE: RoleKey[] = [
  'ops_admin',
  'sales_manager',
  'salesperson',
  'marketing',
  'operations',
  'finance',
  'collaborator',
];

export default async function RolesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!user.roles.some((r) => r === 'tech_superadmin' || r === 'director_vp'))
    return <AccessDenied />;

  const supabase = await createSupabase();
  const { data } = await supabase.from('role_capabilities').select('role,capability');
  const granted: Record<string, string[]> = {};
  for (const r of (data ?? []) as { role: string; capability: string }[])
    (granted[r.role] ??= []).push(r.capability);

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Administración</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Roles y permisos
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Qué puede hacer cada rol. Los cambios aplican de inmediato y quedan en la auditoría. El
          superadministrador y la dirección general siempre tienen acceso completo y no se editan.
        </p>
      </header>
      <RoleMatrix
        roles={EDITABLE.map((key) => ({
          key,
          label: ROLE_LABELS[key],
          granted: granted[key] ?? [],
        }))}
      />
    </div>
  );
}
