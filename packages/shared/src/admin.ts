import { z } from 'zod';
import { loginSchema } from './auth';
import { paginationQuerySchema } from './http';
import { ACTIONS, RESOURCES, SCOPES } from './permissions';

export const USER_STATUSES = ['active', 'invited', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const nameSchema = z.string().trim().min(2, 'Escribe el nombre completo').max(120);

export const createUserSchema = z.object({
  email: loginSchema.shape.email,
  name: nameSchema,
  roleId: z.uuid(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Users are never deleted (audit history keeps referencing them): they are disabled. */
export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    status: z.enum(['active', 'disabled']).optional(),
    roleId: z.uuid().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'No hay cambios que guardar');
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(USER_STATUSES).optional(),
  roleId: z.uuid().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export interface RoleRef {
  id: string;
  key: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  roles: RoleRef[];
  lastLoginAt: string | null;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  createdAt: string;
}

/** Returned once, when a temporary password is issued. It is never stored or logged in clear. */
export interface TemporaryPasswordResult {
  user: AdminUser;
  temporaryPassword: string;
}

export const grantSchema = z.object({
  resource: z.enum(RESOURCES),
  action: z.enum(ACTIONS),
  scope: z.enum(SCOPES),
});

export const replaceGrantsSchema = z.object({
  grants: z
    .array(grantSchema)
    .max(RESOURCES.length * ACTIONS.length)
    .refine(
      (gs) => new Set(gs.map((g) => `${g.resource}:${g.action}`)).size === gs.length,
      'Hay permisos repetidos',
    ),
});
export type ReplaceGrantsInput = z.infer<typeof replaceGrantsSchema>;

export interface AdminRole extends RoleRef {
  isSystem: boolean;
  userCount: number;
  grantCount: number;
}
export interface AdminRoleDetail extends AdminRole {
  grants: z.infer<typeof grantSchema>[];
}

export const auditQuerySchema = paginationQuerySchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  action: z.string().trim().max(60).optional(),
  resource: z.string().trim().max(60).optional(),
  userId: z.uuid().optional(),
  q: z.string().trim().max(100).optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string | null;
  user: { id: string; name: string; email: string } | null;
  ip: string | null;
  before: unknown;
  after: unknown;
}
