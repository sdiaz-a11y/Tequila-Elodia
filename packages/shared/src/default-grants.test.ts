import { describe, expect, it } from 'vitest';
import { grantsForRole } from './default-grants';
import { ACTIONS, RESOURCES, ROLE_KEYS } from './permissions';

describe('default grants', () => {
  it('gives the technical superadmin every permission', () => {
    expect(grantsForRole('tech_superadmin')).toHaveLength(RESOURCES.length * ACTIONS.length);
  });

  it('has unique resource:action pairs and a non-empty set for every role', () => {
    for (const role of ROLE_KEYS) {
      const grants = grantsForRole(role);
      expect(grants.length, role).toBeGreaterThan(0);
      expect(new Set(grants.map((g) => `${g.resource}:${g.action}`)).size, role).toBe(
        grants.length,
      );
    }
  });

  it('keeps finance and internal resources away from the external distributor', () => {
    const resources = new Set(grantsForRole('external_distributor').map((g) => g.resource));
    for (const forbidden of [
      'payments',
      'budgets',
      'expenses',
      'users',
      'roles',
      'audit',
      'settings',
      'leads',
    ]) {
      expect(resources.has(forbidden as never), forbidden).toBe(false);
    }
  });

  it('restricts the external distributor and salesperson to own scope for sensitive data', () => {
    expect(
      grantsForRole('external_distributor').every((g) => g.scope === 'own' && g.action === 'read'),
    ).toBe(true);
    expect(
      grantsForRole('salesperson')
        .filter((g) => g.resource === 'opportunities')
        .every((g) => g.scope === 'own'),
    ).toBe(true);
  });

  it('limits financial data to finance, director and superadmin', () => {
    const withFinance = ROLE_KEYS.filter((r) =>
      grantsForRole(r).some((g) => g.resource === 'expenses'),
    );
    expect(withFinance.sort()).toEqual(['director_vp', 'finance', 'tech_superadmin']);
  });
});
