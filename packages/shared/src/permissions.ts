/** Single source of truth for the permission catalog (see docs/MODULES.md). */
export const ACTIONS = ['read', 'create', 'update', 'delete', 'approve', 'export'] as const;
export type Action = (typeof ACTIONS)[number];

export const SCOPES = ['own', 'team', 'all'] as const;
export type Scope = (typeof SCOPES)[number];

export const RESOURCES = [
  'accounts', 'contacts', 'leads', 'opportunities', 'activities', 'pipeline_stages',
  'quotes', 'orders', 'payments', 'price_lists', 'products', 'variants', 'inventory',
  'distributors', 'territories', 'expansion_plans', 'brand', 'content', 'campaigns',
  'budgets', 'expenses', 'projects', 'tasks', 'compliance', 'reports', 'assistant',
  'automations', 'users', 'roles', 'audit', 'settings',
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ROLE_KEYS = [
  'tech_superadmin', 'director_vp', 'ops_admin', 'sales_manager', 'salesperson',
  'marketing', 'operations', 'finance', 'collaborator', 'external_distributor',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
