import type { Action, Resource, Scope } from '@elodia/shared';

/** Spanish (MX) names for the permission catalog, used by the roles matrix and the audit log. */
export const RESOURCE_LABELS: Record<Resource, string> = {
  accounts: 'Empresas y clientes',
  contacts: 'Contactos',
  leads: 'Prospectos',
  opportunities: 'Oportunidades',
  activities: 'Actividades',
  pipeline_stages: 'Etapas del pipeline',
  quotes: 'Cotizaciones',
  orders: 'Pedidos',
  payments: 'Pagos',
  price_lists: 'Listas de precios',
  products: 'Productos',
  variants: 'Presentaciones y SKU',
  inventory: 'Inventario',
  distributors: 'Distribuidores',
  territories: 'Territorios',
  expansion_plans: 'Planes de expansión',
  brand: 'Marca y Brand Kit',
  content: 'Contenido',
  campaigns: 'Campañas',
  budgets: 'Presupuestos',
  expenses: 'Gastos',
  projects: 'Proyectos',
  tasks: 'Tareas',
  compliance: 'Documentación y cumplimiento',
  reports: 'Reportes',
  assistant: 'Asistente ejecutivo',
  automations: 'Automatizaciones',
  users: 'Usuarios',
  roles: 'Roles y permisos',
  audit: 'Bitácora de auditoría',
  settings: 'Configuración',
};

/** The matrix is read by area, not as one flat list of 31 rows. Every resource appears exactly once. */
export const RESOURCE_GROUPS: { label: string; resources: Resource[] }[] = [
  {
    label: 'Comercial',
    resources: [
      'accounts',
      'contacts',
      'leads',
      'opportunities',
      'activities',
      'pipeline_stages',
      'quotes',
      'orders',
      'payments',
      'price_lists',
    ],
  },
  { label: 'Red y expansión', resources: ['distributors', 'territories', 'expansion_plans'] },
  { label: 'Producto', resources: ['products', 'variants', 'inventory'] },
  { label: 'Marketing', resources: ['brand', 'content', 'campaigns'] },
  { label: 'Finanzas', resources: ['budgets', 'expenses'] },
  { label: 'Operación', resources: ['projects', 'tasks', 'compliance'] },
  { label: 'Inteligencia', resources: ['reports', 'assistant', 'automations'] },
  { label: 'Sistema', resources: ['users', 'roles', 'audit', 'settings'] },
];

export const ACTION_LABELS: Record<Action, string> = {
  read: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  export: 'Exportar',
};

export const SCOPE_LABELS: Record<Scope, string> = {
  own: 'Propios',
  team: 'Equipo',
  all: 'Todos',
};

/** What each audit `action` means to a person. Unknown actions fall back to the raw value. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  logout_all: 'Cierre de todas las sesiones',
  login_failed: 'Intento de acceso fallido',
  login_blocked: 'Intento de acceso bloqueado',
  create: 'Alta',
  update: 'Edición',
  enable: 'Habilitación',
  disable: 'Deshabilitación',
  unlock: 'Desbloqueo de cuenta',
  reset_password: 'Contraseña restablecida',
  change_password: 'Cambio de contraseña',
  update_grants: 'Cambio de permisos',
  reset_grants: 'Permisos restablecidos',
  export: 'Exportación',
  totp_enabled: 'Verificación en dos pasos activada',
  totp_disabled: 'Verificación en dos pasos desactivada',
};

export const auditActionLabel = (action: string): string => AUDIT_ACTION_LABELS[action] ?? action;

export const auditResourceLabel = (resource: string): string =>
  resource === 'auth' ? 'Sesión' : (RESOURCE_LABELS[resource as Resource] ?? resource);

const TIMEZONE = 'America/Mexico_City';

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

/** `YYYY-MM-DD` from a date input → ISO instants covering the whole local day (inclusive). */
export function dayRangeToIso(from: string, to: string): { from?: string; to?: string } {
  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  return {
    ...(valid(from) ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
    ...(valid(to) ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
  };
}
