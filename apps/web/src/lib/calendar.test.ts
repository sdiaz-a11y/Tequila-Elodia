import { describe, expect, it } from 'vitest';
import { dayKey, gridRange, monthGrid, monthKey, parseMonth, shiftMonth } from './calendar';

describe('calendar helpers', () => {
  it('builds six Monday-first weeks that contain the whole month', () => {
    const grid = monthGrid(2026, 10); // 1 Oct 2026 is a Thursday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-09-28');
    expect(grid[3]).toBe('2026-10-01');
    expect(grid).toContain('2026-10-31');
    expect(new Date(`${grid[0]}T12:00:00Z`).getUTCDay()).toBe(1);
  });

  it('starts on the 1st when the month begins on a Monday', () => {
    expect(monthGrid(2026, 6)[0]).toBe('2026-06-01'); // 1 Jun 2026 is a Monday
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthKey(2026, 3)).toBe('2026-03');
  });

  it('parses a month and rejects junk', () => {
    expect(parseMonth('2026-10')).toEqual({ year: 2026, month: 10 });
    const now = new Date('2026-10-23T18:00:00Z');
    expect(parseMonth('2026-13', now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonth('hola', now)).toEqual({ year: 2026, month: 10 });
    expect(parseMonth(undefined, now)).toEqual({ year: 2026, month: 10 });
  });

  it('assigns an instant to its Mexico City calendar day', () => {
    expect(dayKey('2026-10-24T03:30:00Z')).toBe('2026-10-23'); // 21:30 on the 23rd locally
    expect(dayKey('2026-10-23T06:00:00Z')).toBe('2026-10-23'); // 00:00 locally
    expect(dayKey('2026-10-23T05:59:00Z')).toBe('2026-10-22');
  });

  it('bounds the grid in Mexico City time', () => {
    const { from, to } = gridRange(monthGrid(2026, 10));
    expect(from).toBe('2026-09-28T06:00:00.000Z');
    expect(to).toBe('2026-11-09T06:00:00.000Z');
  });
});
