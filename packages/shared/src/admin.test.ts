import { describe, expect, it } from 'vitest';
import { grantsWithin, type GrantLike } from './auth';
import { createUserSchema, replaceGrantsSchema, updateUserSchema } from './admin';

const g = (
  resource: GrantLike['resource'],
  action: GrantLike['action'],
  scope: GrantLike['scope'],
) => ({ resource, action, scope }) satisfies GrantLike;

describe('grantsWithin (anti-escalation)', () => {
  const actor = { 'users:read': 'all', 'accounts:read': 'own', 'tasks:update': 'team' } as const;

  it('allows grants the actor holds at the same or a wider scope', () => {
    expect(grantsWithin(actor, [g('users', 'read', 'all'), g('users', 'read', 'own')])).toBe(true);
    expect(grantsWithin(actor, [g('tasks', 'update', 'team'), g('tasks', 'update', 'own')])).toBe(
      true,
    );
  });

  it('rejects a permission the actor does not hold', () => {
    expect(grantsWithin(actor, [g('users', 'delete', 'own')])).toBe(false);
  });

  it('rejects a wider scope than the actor holds', () => {
    expect(grantsWithin(actor, [g('accounts', 'read', 'team')])).toBe(false);
    expect(grantsWithin(actor, [g('tasks', 'update', 'all')])).toBe(false);
  });

  it('accepts an empty list', () => {
    expect(grantsWithin({}, [])).toBe(true);
  });
});

describe('admin schemas', () => {
  const roleId = '0198f2a0-7c3e-7000-8000-000000000001';

  it('normalizes the email and requires a name and role', () => {
    const parsed = createUserSchema.parse({
      email: ' RCastro@Zigma3.com ',
      name: 'R Castro',
      roleId,
    });
    expect(parsed.email).toBe('rcastro@zigma3.com');
    expect(() => createUserSchema.parse({ email: 'x', name: 'R', roleId })).toThrow();
  });

  it('rejects an empty update and an unknown status', () => {
    expect(() => updateUserSchema.parse({})).toThrow();
    expect(() => updateUserSchema.parse({ status: 'invited' })).toThrow();
    expect(updateUserSchema.parse({ status: 'disabled' })).toEqual({ status: 'disabled' });
  });

  it('rejects duplicated or unknown grants', () => {
    const one = g('accounts', 'read', 'own');
    expect(() => replaceGrantsSchema.parse({ grants: [one, one] })).toThrow();
    expect(() =>
      replaceGrantsSchema.parse({ grants: [{ resource: 'nope', action: 'read', scope: 'own' }] }),
    ).toThrow();
    expect(replaceGrantsSchema.parse({ grants: [one] }).grants).toHaveLength(1);
  });
});
