import { describe, expect, it } from 'vitest';
import { ACTIONS, RESOURCES, SCOPES } from '@elodia/shared';
import {
  ACTION_LABELS,
  RESOURCE_GROUPS,
  RESOURCE_LABELS,
  SCOPE_LABELS,
  auditActionLabel,
  auditResourceLabel,
  dayRangeToIso,
  formatDateTime,
} from './labels';

describe('permission labels', () => {
  it('names every resource, action and scope of the catalog', () => {
    for (const r of RESOURCES) expect(RESOURCE_LABELS[r], r).toBeTruthy();
    for (const a of ACTIONS) expect(ACTION_LABELS[a], a).toBeTruthy();
    for (const s of SCOPES) expect(SCOPE_LABELS[s], s).toBeTruthy();
  });

  it('places every resource in exactly one matrix group', () => {
    const grouped = RESOURCE_GROUPS.flatMap((g) => g.resources);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...RESOURCES].sort());
  });
});

describe('audit labels', () => {
  it('translates known actions and resources and falls back to the raw value', () => {
    expect(auditActionLabel('reset_password')).toBe('Contraseña restablecida');
    expect(auditActionLabel('something_new')).toBe('something_new');
    expect(auditResourceLabel('users')).toBe('Usuarios');
    expect(auditResourceLabel('auth')).toBe('Sesión');
    expect(auditResourceLabel('unknown')).toBe('unknown');
  });
});

describe('dates', () => {
  it('formats in Mexico City time and tolerates empty values', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('2026-10-23T18:30:00.000Z')).toMatch(/23/);
  });

  it('turns day inputs into an inclusive range and ignores invalid ones', () => {
    const r = dayRangeToIso('2026-10-01', '2026-10-31');
    expect(new Date(r.to!).getTime() - new Date(r.from!).getTime()).toBeGreaterThan(
      30 * 86_400_000,
    );
    expect(dayRangeToIso('', '')).toEqual({});
    expect(dayRangeToIso('31/10/2026', '')).toEqual({});
  });
});
