import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** argon2id with the library defaults (OWASP-aligned: 19 MiB, 2 iterations, 1 lane). */
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(storedHash: string, password: string): Promise<boolean> {
    try {
      return await verify(storedHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Burns the same CPU as a real verification so that "unknown email" and "wrong password"
   * are not distinguishable by response time.
   */
  async verifyDummy(password: string): Promise<false> {
    this.dummyHash ??= hash('dummy-password-for-timing-equalization');
    await this.verify(await this.dummyHash, password);
    return false;
  }
}
