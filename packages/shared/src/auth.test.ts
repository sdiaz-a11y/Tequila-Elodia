import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema, permissionKey, widerScope } from './auth';

describe('auth contracts', () => {
  it('enforces the 12-character password policy', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('a-long-enough-passphrase').success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(129)).success).toBe(false);
  });

  it('normalizes the login email and does not apply the password policy', () => {
    const parsed = loginSchema.parse({ email: ' Persona@Example.COM ', password: 'x' });
    expect(parsed.email).toBe('persona@example.com');
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: 'a@b.mx', password: 'x', totpCode: '12345' }).success,
    ).toBe(false);
  });

  it('keeps the widest scope when roles overlap', () => {
    expect(widerScope('own', 'all')).toBe('all');
    expect(widerScope('team', 'own')).toBe('team');
    expect(permissionKey('accounts', 'read')).toBe('accounts:read');
  });
});
