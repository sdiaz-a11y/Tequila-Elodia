import type { Metadata } from 'next';
import { AccessDenied } from '@/components/ui/access-denied';
import { getSessionUser } from '@/lib/session';
import { AuditPanel } from './audit-panel';

export const metadata: Metadata = { title: 'Auditoría' };

export default async function AuditPage() {
  const user = await getSessionUser();
  if (!user || !('audit:read' in user.permissions)) return <AccessDenied />;

  return (
    <div className="animate-fade-up grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">Sistema</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">Auditoría</h1>
        <p className="max-w-2xl text-sm text-muted">
          Quién hizo qué y cuándo en ELODIA OS. Úsala para revisar accesos, cambios de permisos y
          exportaciones.
        </p>
      </header>
      <AuditPanel />
    </div>
  );
}
