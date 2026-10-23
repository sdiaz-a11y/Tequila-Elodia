import { z } from 'zod';
import type { Action, Resource, Scope } from './permissions';

export const PASSWORD_MIN_LENGTH = 12;

/** Policy from docs/SECURITY.md: 12+ characters. Length over composition rules (NIST 800-63B). */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(128, 'La contraseña es demasiado larga');

export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Not checked against the policy on login: existing passwords must not leak policy details.
  password: z.string().min(1).max(128),
  totpCode: totpCodeSchema.optional(),
  /** Only needed if the same email exists in several organizations. */
  organizationId: z.uuid().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const totpEnableSchema = z.object({ code: totpCodeSchema });
export const totpDisableSchema = z.object({
  password: z.string().min(1).max(128),
  code: totpCodeSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface SessionUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  roles: string[];
  totpEnabled: boolean;
  /** Set by an administrator-issued temporary password: the user can only change it until done. */
  mustChangePassword: boolean;
  /** `resource:action` → widest scope granted by any of the user's roles. */
  permissions: Record<string, Scope>;
}

export const permissionKey = (resource: Resource, action: Action): string =>
  `${resource}:${action}`;

const SCOPE_RANK: Record<Scope, number> = { own: 0, team: 1, all: 2 };
export const widerScope = (a: Scope, b: Scope): Scope => (SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b);

export interface GrantLike {
  resource: Resource;
  action: Action;
  scope: Scope;
}

/**
 * Anti-escalation rule: a user may only hand out what they hold themselves. Each grant must be covered
 * by the actor's own permission for the same resource and action, at the same or a wider scope.
 */
export function grantsWithin(
  actorPermissions: Record<string, Scope>,
  grants: readonly GrantLike[],
): boolean {
  return grants.every((g) => {
    const held = actorPermissions[permissionKey(g.resource, g.action)];
    return held !== undefined && SCOPE_RANK[held] >= SCOPE_RANK[g.scope];
  });
}
