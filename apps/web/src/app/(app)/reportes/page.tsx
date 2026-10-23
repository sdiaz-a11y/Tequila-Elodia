import type { Metadata } from 'next';
import { ReportCards } from '@/components/reports/report-cards';
import { AccessDenied } from '@/components/ui/access-denied';
import { REPORTS } from '@/lib/reports';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Reportes' };

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const reports = REPORTS.filter((r) => r.allowed(user)).map(({ kind, label, description }) => ({
    kind,
    label,
    description,
  }));
  if (!reports.length) return <AccessDenied />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <h1 className="font-display text-3xl text-fg">Reportes</h1>
        <p className="mt-1 text-sm text-muted">
          Descarga la información en CSV (se abre en Excel). Cada descarga queda registrada en la
          auditoría.
        </p>
      </div>
      <ReportCards reports={reports} />
    </div>
  );
}
