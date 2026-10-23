import { describe, expect, it } from 'vitest';
import { DEFAULT_PERIOD, formatRange, parsePeriod, periodRange } from './period';

const NOW = new Date(2026, 9, 22, 15, 30); // 22 Oct 2026

const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const range = (key: Parameters<typeof periodRange>[0]) => {
  const r = periodRange(key, NOW);
  return [md(r.from), md(r.to)];
};

describe('period', () => {
  it('falls back to the default for unknown values', () => {
    expect(parsePeriod('30d')).toBe('30d');
    expect(parsePeriod('xyz')).toBe(DEFAULT_PERIOD);
    expect(parsePeriod(null)).toBe(DEFAULT_PERIOD);
  });

  it('computes inclusive ranges in the local calendar', () => {
    expect(range('hoy')).toEqual(['10/22', '10/22']);
    expect(range('7d')).toEqual(['10/16', '10/22']);
    expect(range('30d')).toEqual(['9/23', '10/22']);
    expect(range('mes')).toEqual(['10/1', '10/22']);
    expect(range('trimestre')).toEqual(['10/1', '10/22']);
    expect(range('anio')).toEqual(['1/1', '10/22']);
  });

  it('formats a single day and a range', () => {
    expect(formatRange(periodRange('hoy', NOW))).toContain('2026');
    expect(formatRange(periodRange('mes', NOW))).toContain('–');
  });
});
