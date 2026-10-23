import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applies safe defaults for development', () => {
    const env = parseEnv({});
    expect(env.PORT).toBe(4000);
    expect(env.WEB_ORIGIN).toEqual(['http://localhost:3000']);
    expect(env.NODE_ENV).toBe('development');
  });

  it('splits and validates several origins', () => {
    const env = parseEnv({ WEB_ORIGIN: 'https://a.example.com, https://b.example.com' });
    expect(env.WEB_ORIGIN).toEqual(['https://a.example.com', 'https://b.example.com']);
    expect(() => parseEnv({ WEB_ORIGIN: 'not-a-url' })).toThrow(/WEB_ORIGIN/);
  });

  it('rejects an invalid port', () => {
    expect(() => parseEnv({ PORT: '99999' })).toThrow(/PORT/);
  });

  it('requires DATABASE_URL in production without echoing values', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
    expect(parseEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x' }).DATABASE_URL).toBe(
      'postgresql://x',
    );
    try {
      parseEnv({ PORT: 'super-secret-value' });
    } catch (e) {
      expect(String(e)).not.toContain('super-secret-value');
    }
  });
});
