import {
  ACTIONS,
  RESOURCES,
  type Action,
  type Resource,
  type RoleKey,
  type Scope,
} from './permissions';

export interface Grant {
  resource: Resource;
  action: Action;
  scope: Scope;
}

type Rule = readonly [resources: readonly Resource[], actions: readonly Action[], scope: Scope];

const CRM: Resource[] = ['accounts', 'contacts', 'leads', 'opportunities', 'activities'];
const SALES: Resource[] = ['quotes', 'orders', 'price_lists'];
const CATALOG: Resource[] = ['products', 'variants'];
const MARKETING: Resource[] = ['brand', 'content', 'campaigns'];
const WORK: Resource[] = ['projects', 'tasks'];
const READ: Action[] = ['read'];
const WRITE: Action[] = ['read', 'create', 'update'];
const MANAGE: Action[] = ['read', 'create', 'update', 'delete', 'export'];

/**
 * Initial (editable) permission matrix per system role. It is a proposal: the business must
 * validate it (docs/DECISIONS.md D12). Anything not listed is denied (deny-by-default).
 */
const RULES: Record<RoleKey, readonly Rule[]> = {
  // Technical owner: everything, everywhere.
  tech_superadmin: [[RESOURCES, ACTIONS, 'all']],
  director_vp: [
    [RESOURCES, ['read', 'export'], 'all'],
    [
      [
        ...CRM,
        ...SALES,
        ...CATALOG,
        ...MARKETING,
        ...WORK,
        'distributors',
        'territories',
        'expansion_plans',
        'pipeline_stages',
        'campaigns',
        'budgets',
        'compliance',
        'reports',
      ],
      ['create', 'update', 'approve'],
      'all',
    ],
  ],
  ops_admin: [
    [['users', 'roles', 'settings', 'audit'], ['read', 'create', 'update'], 'all'],
    [['users', 'roles', 'audit'], ['export'], 'all'],
  ],
  sales_manager: [
    [[...CRM, ...SALES, 'distributors', 'territories', 'expansion_plans'], MANAGE, 'all'],
    [['pipeline_stages', ...CATALOG, 'reports'], READ, 'all'],
    [['quotes', 'orders'], ['approve'], 'all'],
    [WORK, WRITE, 'all'],
  ],
  salesperson: [
    [CRM, WRITE, 'own'],
    [['quotes', 'orders'], WRITE, 'own'],
    [['pipeline_stages', 'price_lists', ...CATALOG, 'territories'], READ, 'all'],
    [['tasks'], WRITE, 'own'],
  ],
  marketing: [
    [MARKETING, MANAGE, 'all'],
    [['content', 'campaigns'], ['approve'], 'team'],
    [[...CATALOG, 'leads', 'reports'], READ, 'all'],
    [WORK, WRITE, 'all'],
  ],
  operations: [
    [['inventory', ...CATALOG, 'orders'], WRITE, 'all'],
    [['compliance'], WRITE, 'all'],
    [['accounts', 'distributors', 'territories'], READ, 'all'],
    [WORK, WRITE, 'all'],
  ],
  finance: [
    [['payments', 'budgets', 'expenses'], MANAGE, 'all'],
    [['quotes', 'orders', 'price_lists', 'accounts', 'reports'], READ, 'all'],
    [['budgets', 'expenses'], ['approve'], 'all'],
  ],
  collaborator: [
    [['tasks'], WRITE, 'own'],
    [['projects'], READ, 'own'],
    [['activities'], READ, 'own'],
  ],
  // Limited to their own distributor data; no finance, CRM-wide or internal resources.
  external_distributor: [[['orders', 'products', 'variants', 'accounts'], READ, 'own']],
};

export function grantsForRole(role: RoleKey): Grant[] {
  const seen = new Map<string, Grant>();
  for (const [resources, actions, scope] of RULES[role]) {
    for (const resource of resources) {
      for (const action of actions) {
        seen.set(`${resource}:${action}`, { resource, action, scope });
      }
    }
  }
  return [...seen.values()];
}
