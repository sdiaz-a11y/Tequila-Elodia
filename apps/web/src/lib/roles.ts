import type { SessionUser } from '@elodia/shared';

/** Mirrors the SQL functions can_read / can_write / can_manage / can_admin (supabase/migrations). The database is the real gate. */
const READ = [
  'tech_superadmin',
  'director_vp',
  'ops_admin',
  'sales_manager',
  'salesperson',
  'marketing',
  'operations',
  'finance',
  'collaborator',
];
const WRITE = ['tech_superadmin', 'director_vp', 'ops_admin', 'sales_manager', 'salesperson'];
const MANAGE = ['tech_superadmin', 'director_vp', 'ops_admin', 'sales_manager'];
const ADMIN = ['tech_superadmin', 'director_vp', 'ops_admin'];

const has = (user: Pick<SessionUser, 'roles'>, list: string[]) =>
  user.roles.some((r) => list.includes(r));
export const canRead = (u: Pick<SessionUser, 'roles'>) => has(u, READ);
export const canWrite = (u: Pick<SessionUser, 'roles'>) => has(u, WRITE);
export const canManage = (u: Pick<SessionUser, 'roles'>) => has(u, MANAGE);
export const canAdmin = (u: Pick<SessionUser, 'roles'>) => has(u, ADMIN);

/** Mirrors can_content / can_approve: who edits content, and who approves it or marks assets as official. */
const CONTENT = ['tech_superadmin', 'director_vp', 'ops_admin', 'sales_manager', 'marketing'];
const APPROVE = ['tech_superadmin', 'director_vp', 'ops_admin'];
export const canContent = (u: Pick<SessionUser, 'roles'>) => has(u, CONTENT);
export const canApprove = (u: Pick<SessionUser, 'roles'>) => has(u, APPROVE);

const OPS = [
  'tech_superadmin',
  'director_vp',
  'ops_admin',
  'sales_manager',
  'marketing',
  'operations',
];
export const canOps = (u: Pick<SessionUser, 'roles'>) => has(u, OPS);

/** Who may create/edit and who may delete, per entity. Mirrors the RLS policies in supabase/migrations. */
export function entityPermissions(
  user: Pick<SessionUser, 'roles'>,
  key: string,
): { read: boolean; write: boolean; remove: boolean } {
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

const FINANCE = ['tech_superadmin', 'director_vp', 'ops_admin', 'finance'];
const COMPLIANCE = ['tech_superadmin', 'director_vp', 'ops_admin', 'operations'];
export const canFinance = (u: Pick<SessionUser, 'roles'>) => has(u, FINANCE);
export const canCompliance = (u: Pick<SessionUser, 'roles'>) => has(u, COMPLIANCE);

const COLLECT = ['tech_superadmin', 'director_vp', 'ops_admin', 'finance', 'sales_manager'];
export const canCollect = (u: Pick<SessionUser, 'roles'>) => has(u, COLLECT);

const INVENTORY = ['tech_superadmin', 'director_vp', 'ops_admin', 'operations'];
export const canInventory = (u: Pick<SessionUser, 'roles'>) => has(u, INVENTORY);
