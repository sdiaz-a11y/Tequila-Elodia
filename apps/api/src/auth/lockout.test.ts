import { describe, expect, it } from 'vitest';
import { lockMinutes } from './auth.service';

describe('progressive lockout', () => {
  it('does not lock before the 5th failure', () => {
    for (const n of [1, 2, 3, 4]) expect(lockMinutes(n)).toBe(0);
  });
  it('doubles from 1 minute and caps at 60', () => {
    expect([5, 6, 7, 8].map(lockMinutes)).toEqual([1, 2, 4, 8]);
    expect(lockMinutes(30)).toBe(60);
  });
});
