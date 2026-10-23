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
