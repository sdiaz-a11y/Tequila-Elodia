import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN_LENGTH, passwordSchema } from '@elodia/shared';
import { assertAllScope, csvCell, csvRow, generateTemporaryPassword } from './admin.helpers';

describe('generateTemporaryPassword', () => {
  it('meets the password policy and is not repeated', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const pw = generateTemporaryPassword();
      expect(pw.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
      expect(passwordSchema.safeParse(pw).success).toBe(true);
      expect(pw).toMatch(/^[a-zA-Z2-9]{5}-[a-zA-Z2-9]{5}-[a-zA-Z2-9]{5}$/);
      seen.add(pw);
    }
    expect(seen.size).toBe(200);
  });

  it('avoids look-alike characters', () => {
    for (let i = 0; i < 200; i++) expect(generateTemporaryPassword()).not.toMatch(/[0OIl1]/);
  });
});

describe('csv', () => {
  it('quotes separators, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('di"jo')).toBe('"di""jo"');
    expect(csvCell('l1\nl2')).toBe('"l1\nl2"');
    expect(csvCell(null)).toBe('');
  });

  it('neutralises spreadsheet formulas', () => {
    for (const evil of ['=1+1', '+SUM(A1)', '-2', '@cmd', '\tx']) {
      expect(csvCell(evil).replace(/^"/, '')).toMatch(/^'/);
    }
    expect(csvCell('normal')).toBe('normal');
  });

  it('joins a row', () => {
    expect(csvRow(['a', 1, 'b,c'])).toBe('a,1,"b,c"');
  });
});

describe('assertAllScope', () => {
  it('only accepts the "all" scope', () => {
    expect(() => assertAllScope('all')).not.toThrow();
    for (const s of ['own', 'team', undefined] as const) expect(() => assertAllScope(s)).toThrow();
  });
});
