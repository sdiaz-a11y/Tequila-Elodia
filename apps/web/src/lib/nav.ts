import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Boxes,
  CalendarDays,
  ChartColumn,
  FileBarChart,
  FileCheck,
  FileText,
  FolderKanban,
  Globe,
  Handshake,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Package,
  Plug,
  Route,
  ScrollText,
  Settings,
  Share2,
  ShoppingCart,
  Sparkles,
  Target,
  Truck,
  UsersRound,
  Wallet,
  Workflow,
} from 'lucide-react';
import type { Action, Resource, SessionUser } from '@elodia/shared';

export const COMING_SOON_LABEL = 'Próximamente';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** `live` navigates; `soon` is listed (permission-aware) but not clickable until its sprint ships. */
  status: 'live' | 'soon';
  /** Internal roadmap milestone (docs only). The UI shows COMING_SOON_LABEL instead. */
  plan?: string;
  /** Needs `resource:read`. Omitted = any signed-in user. */
  resource?: Resource;
  usesPeriod?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Dirección',
    items: [
      {
        label: 'Dashboard ejecutivo',
        href: '/',
        icon: LayoutDashboard,
        status: 'live',
        usesPeriod: true,
      },
      {
        label: 'Planeación estratégica',
        href: '/planeacion',
        icon: Target,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'projects',
      },
      {
        label: 'Business Intelligence',
        href: '/bi',
        icon: ChartColumn,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'reports',
      },
    ],
  },
  {
    label: 'Comercial',
    items: [
      {
        label: 'Empresas y prospectos',
        href: '/empresas',
        icon: Handshake,
        status: 'live',
        resource: 'accounts',
      },
      {
        label: 'Contactos',
        href: '/contactos',
        icon: UsersRound,
        status: 'live',
        resource: 'contacts',
      },
      {
        label: 'Pipeline',
        href: '/pipeline',
        icon: Target,
        status: 'live',
        resource: 'opportunities',
      },
      {
        label: 'Actividades',
        href: '/actividades',
        icon: CalendarDays,
        status: 'live',
        resource: 'activities',
      },
      {
        label: 'Cotizaciones',
        href: '/cotizaciones',
        icon: FileText,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'quotes',
      },
      {
        label: 'Pedidos',
        href: '/pedidos',
        icon: ShoppingCart,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'orders',
      },
      {
        label: 'Distribuidores',
        href: '/distribuidores',
        icon: Truck,
        status: 'live',
        resource: 'distributors',
      },
      {
        label: 'Territorios',
        href: '/territorios',
        icon: Globe,
        status: 'live',
        resource: 'territories',
      },
    ],
  },
  {
    label: 'Marketing',
    items: [
      {
        label: 'Content Studio IA',
        href: '/content-studio',
        icon: Sparkles,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'content',
      },
      {
        label: 'Calendario editorial',
        href: '/calendario',
        icon: CalendarDays,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'content',
      },
      {
        label: 'Campañas',
        href: '/campanas',
        icon: Megaphone,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'campaigns',
      },
      {
        label: 'Redes sociales',
        href: '/redes',
        icon: Share2,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'content',
      },
      {
        label: 'Biblioteca multimedia',
        href: '/biblioteca',
        icon: Images,
        status: 'soon',
        plan: 'Sprint 1.10',
        resource: 'brand',
      },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      {
        label: 'Productos',
        href: '/productos',
        icon: Package,
        status: 'soon',
        plan: 'Sprint 1.10',
        resource: 'products',
      },
      {
        label: 'Inventario',
        href: '/inventario',
        icon: Boxes,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'inventory',
      },
      {
        label: 'Logística',
        href: '/logistica',
        icon: Route,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'inventory',
      },
      {
        label: 'Documentación y cumplimiento',
        href: '/cumplimiento',
        icon: FileCheck,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'compliance',
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        label: 'Finanzas',
        href: '/finanzas',
        icon: Wallet,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'budgets',
      },
      {
        label: 'Proyectos',
        href: '/proyectos',
        icon: FolderKanban,
        status: 'soon',
        plan: 'Sprint 1.9',
        resource: 'projects',
      },
      {
        label: 'Equipo',
        href: '/equipo',
        icon: KeyRound,
        status: 'live',
        resource: 'tasks',
      },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      {
        label: 'Asistente ejecutivo',
        href: '/asistente',
        icon: Bot,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'assistant',
      },
      {
        label: 'Automatizaciones',
        href: '/automatizaciones',
        icon: Workflow,
        status: 'soon',
        plan: 'Fase 2',
        resource: 'automations',
      },
      {
        label: 'Reportes',
        href: '/reportes',
        icon: FileBarChart,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'reports',
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        label: 'Configuración',
        href: '/configuracion',
        icon: Settings,
        status: 'soon',
        plan: 'Por definir',
        resource: 'settings',
      },
      {
        label: 'Integraciones',
        href: '/integraciones',
        icon: Plug,
        status: 'soon',
        plan: 'Fase 3',
        resource: 'settings',
      },
      {
        label: 'Auditoría',
        href: '/auditoria',
        icon: ScrollText,
        status: 'live',
        resource: 'audit',
      },
    ],
  },
];

export const ACCOUNT_PAGES = [{ label: 'Cambiar contraseña', href: '/cuenta/contrasena' }] as const;

const READ: Action = 'read';

/** UI-only filter: hides what the user cannot read. The API remains the real authority. */
export function canSee(item: NavItem, user: Pick<SessionUser, 'permissions'>): boolean {
  return !item.resource || `${item.resource}:${READ}` in user.permissions;
}

export function visibleNav(user: Pick<SessionUser, 'permissions'>): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => canSee(i, user)) })).filter(
    (g) => g.items.length > 0,
  );
}

export function flatNav(): NavItem[] {
  return NAV.flatMap((g) => g.items);
}

export function findNavItem(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV) {
    const item = group.items.find((i) =>
      i.href === '/' ? pathname === '/' : pathname === i.href || pathname.startsWith(`${i.href}/`),
    );
    if (item) return { group, item };
  }
  return null;
}

export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbsFor(pathname: string): Crumb[] {
  const account = ACCOUNT_PAGES.find((p) => p.href === pathname);
  if (account) return [{ label: 'Cuenta' }, { label: account.label }];
  if (pathname === '/usuarios/roles') return [{ label: 'Administración' }];
  const hit = findNavItem(pathname);
  if (!hit) return [{ label: 'Inicio', href: '/' }];
  if (hit.item.href === '/') return [{ label: 'Dirección' }, { label: hit.item.label }];
  return [{ label: hit.group.label }, { label: hit.item.label }];
}

/** `?next=` must be a same-site path; anything else falls back to the home page. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  return next;
}
