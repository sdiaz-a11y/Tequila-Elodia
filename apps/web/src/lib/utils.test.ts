import { describe, expect, it } from 'vitest';
import { cn, greetingFor, initials } from './utils';

describe('utils', () => {
  it('merges conflicting tailwind classes', () => {
    const hidden = false as boolean;
    expect(cn('px-2', 'px-4', hidden && 'hidden')).toBe('px-4');
  });

  it('builds initials from one or several names', () => {
    expect(initials('Samuel Díaz')).toBe('SD');
    expect(initials('  ana  maría  pérez ')).toBe('AP');
    expect(initials('Madonna')).toBe('M');
    expect(initials('')).toBe('?');
  });

  it('greets by Mexico City hour regardless of host timezone', () => {
    expect(greetingFor(new Date('2026-10-22T15:00:00Z'))).toBe('Buenos días'); // 09:00 CST
    expect(greetingFor(new Date('2026-10-22T20:00:00Z'))).toBe('Buenas tardes'); // 14:00
    expect(greetingFor(new Date('2026-10-23T03:00:00Z'))).toBe('Buenas noches'); // 21:00
    expect(greetingFor(new Date('2026-10-23T07:00:00Z'))).toBe('Buenas noches'); // 01:00, still night
  });
});
