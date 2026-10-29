import type { SessionUser } from '@elodia/shared';

/** The signed-in user; capabilities come from the database (role_capabilities), so edits to a role apply at once. */
export type RoleUser = Pick<SessionUser, 'roles'> & { capabilities?: readonly string[] };

export const CAPABILITIES = [
  'read',
  'write',
  'manage',
  'admin',
  'content',
  'approve',
  'ops',
  'collect',
  'finance',
  'compliance',
  'inventory',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Initial matrix; mirrors the seed of role_capabilities (migration 0011). Used only when the database list is not loaded. */
const SUPER = ['tech_superadmin', 'director_vp', 'ops_admin'];
export const DEFAULT_CAPABILITY_ROLES: Record<Capability, string[]> = {
  read: [
    ...SUPER,
    'sales_manager',
    'salesperson',
    'marketing',
    'operations',
    'finance',
    'collaborator',
  ],
  write: [...SUPER, 'sales_manager', 'salesperson'],
  manage: [...SUPER, 'sales_manager'],
  admin: SUPER,
  content: [...SUPER, 'sales_manager', 'marketing'],
  approve: SUPER,
  ops: [...SUPER, 'sales_manager', 'marketing', 'operations'],
  collect: [...SUPER, 'finance', 'sales_manager'],
  finance: [...SUPER, 'finance'],
  compliance: [...SUPER, 'operations'],
  inventory: [...SUPER, 'operations'],
};

const has = (u: RoleUser, cap: Capability) =>
  u.roles.includes('tech_superadmin') ||
  (u.capabilities
    ? u.capabilities.includes(cap)
    : u.roles.some((r) => DEFAULT_CAPABILITY_ROLES[cap].includes(r)));

export const canRead = (u: RoleUser) => has(u, 'read');
export const canWrite = (u: RoleUser) => has(u, 'write');
export const canManage = (u: RoleUser) => has(u, 'manage');
export const canAdmin = (u: RoleUser) => has(u, 'admin');
export const canContent = (u: RoleUser) => has(u, 'content');
export const canApprove = (u: RoleUser) => has(u, 'approve');
export const canOps = (u: RoleUser) => has(u, 'ops');
export const canFinance = (u: RoleUser) => has(u, 'finance');
export const canCompliance = (u: RoleUser) => has(u, 'compliance');
export const canCollect = (u: RoleUser) => has(u, 'collect');
export const canInventory = (u: RoleUser) => has(u, 'inventory');

/** Who may create/edit and who may delete, per entity. Mirrors the RLS policies in supabase/migrations. */
export function entityPermissions(
  user: RoleUser,
  key: string,
): { read: boolean; write: boolean; remove: boolean } {
  if (key === 'objectives')
    return { read: canRead(user), write: canManage(user), remove: canApprove(user) };
  if (key === 'social_posts')
    return { read: canRead(user), write: canContent(user), remove: false };
  if (key === 'warehouses' || key === 'lots') {
    const ok = canInventory(user);
    return { read: canRead(user), write: ok, remove: canApprove(user) };
  }
  if (key === 'pipeline_stages') {
    const ok = canAdmin(user);
    return { read: canRead(user), write: ok, remove: ok };
  }
  if (key === 'transactions') {
    const ok = canFinance(user);
    return { read: ok, write: ok, remove: ok };
  }
  if (key === 'compliance_documents')
    return { read: canRead(user), write: canCompliance(user), remove: canApprove(user) };
  const read = canRead(user);
  if (key === 'projects' || key === 'products' || key === 'variants')
    return { read, write: canOps(user), remove: canManage(user) };
  if (key === 'campaigns') return { read, write: canContent(user), remove: canApprove(user) };
  return { read, write: canWrite(user), remove: canManage(user) };
}
