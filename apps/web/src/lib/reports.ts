import { canFinance, canRead } from '@/lib/roles';
import type { SessionUser } from '@elodia/shared';

export interface ReportDef {
  kind: string;
  label: string;
  description: string;
  dated: boolean;
  allowed: (u: Pick<SessionUser, 'roles'>) => boolean;
}

export const REPORTS: ReportDef[] = [
  {
    kind: 'accounts',
    label: 'Empresas',
    description: 'Prospectos, clientes y socios con su ubicación.',
    dated: true,
    allowed: canRead,
  },
  {
    kind: 'opportunities',
    label: 'Oportunidades',
    description: 'Pipeline con etapa, monto y cierre esperado.',
    dated: true,
    allowed: canRead,
  },
  {
    kind: 'quotes',
    label: 'Cotizaciones',
    description: 'Folio, cliente, estado y total.',
    dated: true,
    allowed: canRead,
  },
  {
    kind: 'orders',
    label: 'Pedidos',
    description: 'Folio, cliente, estado, total y cobrado.',
    dated: true,
    allowed: canRead,
  },
  {
    kind: 'social_posts',
    label: 'Redes sociales',
    description: 'Publicaciones con alcance e interacciones.',
    dated: true,
    allowed: canRead,
  },
  {
    kind: 'transactions',
    label: 'Finanzas',
    description: 'Ingresos y gastos registrados.',
    dated: true,
    allowed: canFinance,
  },
];

export const isoDay = (s: string | null | undefined): string | null =>
  s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
