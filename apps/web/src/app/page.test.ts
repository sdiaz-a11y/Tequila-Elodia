import { describe, expect, it } from 'vitest';
import { RESOURCES } from '@elodia/shared';

describe('web workspace wiring', () => {
  it('can import the shared package', () => {
    expect(RESOURCES.length).toBeGreaterThan(0);
  });
});
