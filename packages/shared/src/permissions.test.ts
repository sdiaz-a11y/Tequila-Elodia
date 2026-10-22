import { describe, expect, it } from 'vitest';
import { ACTIONS, RESOURCES, ROLE_KEYS } from './permissions';

describe('permission catalog', () => {
  it('has no duplicate entries', () => {
    for (const list of [ACTIONS, RESOURCES, ROLE_KEYS]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
  it('defines the 10 initial roles', () => {
    expect(ROLE_KEYS).toHaveLength(10);
  });
});
