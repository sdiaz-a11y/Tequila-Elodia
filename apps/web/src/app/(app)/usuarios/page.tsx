import type { Metadata } from 'next';
import { AdminTabs } from '@/components/admin/admin-tabs';
import { AccessDenied } from '@/components/ui/access-denied';
import { getSessionUser } from '@/lib/session';
import { UsersPanel } from './users-panel';

export const metadata: Metadata = { title: 'Usuarios y permisos' };

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || !('users:read' in user.permissions)) return <AccessDenied />;

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Administración</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          Usuarios y permisos
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Quién tiene acceso a ELODIA OS y con qué rol. Cada alta, cambio y restablecimiento queda
          registrado en la bitácora.
        </p>
      </header>
      <AdminTabs />
      <UsersPanel />
    </div>
  );
}
