import { describe, expect, it } from 'vitest';
import { grantsForRole, permissionKey, type RoleKey, type SessionUser } from '@elodia/shared';
import { NAV, breadcrumbsFor, canSee, findNavItem, flatNav, safeNext, visibleNav } from './nav';

function userWith(role: RoleKey): Pick<SessionUser, 'permissions'> {
  const permissions: SessionUser['permissions'] = {};
  for (const g of grantsForRole(role)) permissions[permissionKey(g.resource, g.action)] = g.scope;
  return { permissions };
}

describe('navigation', () => {
  it('has unique hrefs and the seven groups from the product spec', () => {
    const hrefs = flatNav().map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(NAV.map((g) => g.label)).toEqual([
      'Dirección',
      'Comercial',
      'Marketing',
      'Operaciones',
      'Administración',
      'Inteligencia',
      'Sistema',
    ]);
  });

  it('only marks the built modules as live and gives every pending module an internal plan', () => {
    for (const item of flatNav()) {
      if (item.status === 'soon') expect(item.plan, item.label).toBeTruthy();
    }
    expect(
      flatNav()
        .filter((i) => i.status === 'live')
        .map((i) => i.href),
    ).toEqual([
      '/',
      '/empresas',
      '/contactos',
      '/pipeline',
      '/actividades',
      '/distribuidores',
      '/territorios',
      '/equipo',
      '/auditoria',
    ]);
  });

  it('hides modules the role cannot read (UI hint only; the API enforces)', () => {
    const labels = (role: RoleKey) =>
      visibleNav(userWith(role)).flatMap((g) => g.items.map((i) => i.label));
    expect(labels('tech_superadmin')).toHaveLength(flatNav().length);
    expect(labels('salesperson')).toContain('Empresas y prospectos');
    expect(labels('salesperson')).not.toContain('Finanzas');
    expect(labels('salesperson')).not.toContain('Auditoría');
    // A distributor reads its own account, but nothing commercial-internal or financial.
    expect(labels('external_distributor')).not.toContain('Oportunidades');
    expect(labels('external_distributor')).not.toContain('Finanzas');
    expect(labels('finance')).toContain('Finanzas');
  });

  it('drops groups left empty and always keeps the dashboard', () => {
    const groups = visibleNav(userWith('external_distributor'));
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    expect(groups[0]?.items[0]?.href).toBe('/');
    expect(canSee(flatNav()[0]!, { permissions: {} })).toBe(true);
  });

  it('resolves the active item and breadcrumbs', () => {
    expect(findNavItem('/')?.item.label).toBe('Dashboard ejecutivo');
    expect(findNavItem('/empresas/123')?.item.href).toBe('/empresas');
    expect(findNavItem('/nada')).toBeNull();
    expect(breadcrumbsFor('/empresas')).toEqual([
      { label: 'Comercial' },
      { label: 'Empresas y prospectos' },
    ]);
    expect(breadcrumbsFor('/cuenta/contrasena')).toEqual([
      { label: 'Cuenta' },
      { label: 'Cambiar contraseña' },
    ]);
  });
});

describe('safeNext', () => {
  it('keeps same-site paths and rejects open redirects', () => {
    expect(safeNext('/crm?x=1')).toBe('/crm?x=1');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
  });
});
