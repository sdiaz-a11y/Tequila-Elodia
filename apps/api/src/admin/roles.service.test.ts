import { describe, expect, it } from 'vitest';
import type { GrantLike } from '@elodia/shared';
import { diffGrants } from './roles.service';

const g = (
  resource: GrantLike['resource'],
  action: GrantLike['action'],
  scope: GrantLike['scope'],
) => ({ resource, action, scope }) satisfies GrantLike;

describe('diffGrants', () => {
  it('reports additions, removals and scope changes', () => {
    const current = [
      g('accounts', 'read', 'own'),
      g('leads', 'read', 'all'),
      g('tasks', 'read', 'own'),
    ];
    const desired = [
      g('accounts', 'read', 'all'),
      g('leads', 'read', 'all'),
      g('tasks', 'create', 'own'),
    ];
    expect(diffGrants(current, desired)).toEqual({
      added: ['tasks:create:own'],
      removed: ['tasks:read'],
      changed: [{ permission: 'accounts:read', from: 'own', to: 'all' }],
    });
  });

  it('is empty when nothing changes, whatever the order', () => {
    const a = [g('accounts', 'read', 'own'), g('leads', 'read', 'all')];
    const b = [g('leads', 'read', 'all'), g('accounts', 'read', 'own')];
    expect(diffGrants(a, b)).toEqual({ added: [], removed: [], changed: [] });
  });
});
