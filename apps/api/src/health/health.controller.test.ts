import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@elodia/shared';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a valid health payload', () => {
    const res = new HealthController().check();
    expect(healthResponseSchema.safeParse(res).success).toBe(true);
    expect(res.status).toBe('ok');
  });
});
