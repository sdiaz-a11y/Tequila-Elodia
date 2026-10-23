import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './secret-box';
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  otpauthUri,
  totpCode,
  verifyTotp,
} from './totp';

// RFC 6238 appendix B secret ("12345678901234567890"), SHA-1.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
  it('matches the RFC 6238 test vectors', () => {
    expect(totpCode(RFC_SECRET, 59_000, 8)).toBe('94287082');
    expect(totpCode(RFC_SECRET, 1_111_111_109_000, 8)).toBe('07081804');
    expect(totpCode(RFC_SECRET, 1_234_567_890_000, 8)).toBe('89005924');
  });

  it('round-trips base32', () => {
    const secret = generateTotpSecret();
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    expect(() => base32Decode('not*base32')).toThrow();
  });

  it('accepts ±1 step of drift but not more', () => {
    const now = 1_700_000_000_000;
    const code = totpCode(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, now + 30_000)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, now + 90_000)).toBe(false);
    expect(verifyTotp(RFC_SECRET, '000000', now)).toBe(code === '000000');
  });

  it('builds an otpauth URI', () => {
    const uri = otpauthUri('ELODIA OS', 'a@b.mx', RFC_SECRET);
    expect(uri).toContain('otpauth://totp/ELODIA%20OS%3Aa%40b.mx');
    expect(uri).toContain(`secret=${RFC_SECRET}`);
  });
});

describe('secret box', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  it('round-trips and detects tampering or a wrong key', () => {
    const boxed = encryptSecret('JBSWY3DPEHPK3PXP', key);
    expect(boxed).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptSecret(boxed, key)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptSecret(boxed.slice(0, -2) + 'AA', key)).toThrow();
    expect(() => decryptSecret(boxed, Buffer.alloc(32, 8).toString('base64'))).toThrow();
  });
  it('uses a fresh IV each time', () => {
    expect(encryptSecret('x', key)).not.toBe(encryptSecret('x', key));
  });
});
