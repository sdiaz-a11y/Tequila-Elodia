import 'reflect-metadata';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { config as loadEnv } from 'dotenv';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '@elodia/database';
import { seed } from '@elodia/database/dist/seed';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { parseEnv } from '../core/config/env';
import { Authenticated, Requires } from './auth.types';
import { PasswordService } from './password.service';
import { totpCode } from './totp';

// Each test chains remote round-trips and argon2 verifications; 5 s is too tight under load.
vi.setConfig({ testTimeout: 60_000 });

loadEnv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

// Real Supabase database; skipped without a connection (e.g. CI). Uses a dedicated test organization so
// the (append-only) audit rows never mix with ELODIA's. Users are created once per run with random emails.
const hasDb = Boolean(process.env.DATABASE_URL);
const TEST_ORG = 'ELODIA-TEST';
const CSRF = ['x-elodia-csrf', '1'] as const;

@Controller('probe')
class ProbeController {
  @Get('allowed')
  @Requires('accounts', 'read')
  allowed() {
    return { ok: true };
  }
  @Get('forbidden')
  @Requires('users', 'read')
  forbidden() {
    return { ok: true };
  }
  @Get('unreviewed')
  unreviewed() {
    return { ok: true };
  }
  @Get('any-session')
  @Authenticated()
  anySession() {
    return { ok: true };
  }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe.skipIf(!hasDb)('authentication & authorization (Supabase)', () => {
  const prisma = hasDb ? createPrismaClient() : (undefined as never);
  const passwords = new PasswordService();
  const password = `Pw-${randomBytes(9).toString('base64url')}`;
  const tag = randomUUID().slice(0, 8);
  const emailOf = (n: string) => `${n}-${tag}@elodia-test.invalid`;
  let app: INestApplication;

  const http = () => request(app.getHttpServer());
  const login = (email: string, pw = password, extra: object = {}) =>
    http()
      .post('/api/v1/auth/login')
      .set(...CSRF)
      .send({ email, password: pw, ...extra });
  const cookieOf = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;

  async function createUser(name: string, roleKey: string) {
    const org = await prisma.organization.findFirstOrThrow({ where: { name: TEST_ORG } });
    const role = await prisma.role.findUniqueOrThrow({
      where: { organizationId_key: { organizationId: org.id, key: roleKey } },
    });
    return prisma.user.create({
      data: {
        organizationId: org.id,
        email: emailOf(name),
        name,
        status: 'active',
        passwordHash: await passwords.hash(password),
        roles: { create: { roleId: role.id } },
      },
    });
  }

  beforeAll(async () => {
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    process.env.LOGIN_RATE_LIMIT = '1000';
    await seed(prisma, TEST_ORG);
    for (const n of ['seller', 'lock', 'twofa', 'disabled']) await createUser(n, 'salesperson');
    await prisma.user.update({
      where: {
        organizationId_email: {
          organizationId: (
            await prisma.organization.findFirstOrThrow({ where: { name: TEST_ORG } })
          ).id,
          email: emailOf('disabled'),
        },
      },
      data: { status: 'disabled' },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, parseEnv());
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    // Users with audit history cannot be deleted by design (FK RESTRICT); they are inert test accounts.
    await prisma?.session.deleteMany({
      where: { user: { email: { endsWith: `-${tag}@elodia-test.invalid` } } },
    });
    await prisma?.$disconnect();
  });

  it('rejects unsafe requests without the CSRF header or from a foreign origin', async () => {
    await http()
      .post('/api/v1/auth/login')
      .send({ email: emailOf('seller'), password })
      .expect(403);
    await http()
      .post('/api/v1/auth/login')
      .set(...CSRF)
      .set('Origin', 'https://evil.example')
      .send({ email: emailOf('seller'), password })
      .expect(403);
  });

  it('logs in, sets a hardened cookie and never exposes the hash', async () => {
    const res = await login(emailOf('seller')).expect(200);
    const setCookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(res.body.user).toMatchObject({
      email: emailOf('seller'),
      roles: ['salesperson'],
      totpEnabled: false,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|passwordHash|totp_secret/i);
    expect(res.body.user.permissions['accounts:read']).toBe('own');
  });

  it('returns the same generic 401 for wrong password, unknown user and disabled user', async () => {
    const bodies = [
      (await login(emailOf('seller'), 'wrong-password-123').expect(401)).body.detail,
      (await login(`nobody-${tag}@elodia-test.invalid`).expect(401)).body.detail,
      (await login(emailOf('disabled')).expect(401)).body.detail,
    ];
    expect(new Set(bodies)).toEqual(new Set(['Credenciales inválidas']));
  });

  it('enforces deny-by-default: 401 without session, 403 for unreviewed routes and missing permissions', async () => {
    await http().get('/api/v1/probe/allowed').expect(401);
    await http().get('/api/v1/auth/me').expect(401);
    const cookie = cookieOf(await login(emailOf('seller')).expect(200));
    await http().get('/api/v1/probe/allowed').set('Cookie', cookie).expect(200);
    await http().get('/api/v1/probe/forbidden').set('Cookie', cookie).expect(403);
    await http().get('/api/v1/probe/unreviewed').set('Cookie', cookie).expect(403);
    await http().get('/api/v1/probe/any-session').set('Cookie', cookie).expect(200);
    const me = await http().get('/api/v1/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.user.email).toBe(emailOf('seller'));
  });

  it('rejects a forged or tampered session token', async () => {
    await http()
      .get('/api/v1/auth/me')
      .set('Cookie', 'elodia_session=not-a-real-token')
      .expect(401);
  });

  it('logout revokes the session server-side', async () => {
    const cookie = cookieOf(await login(emailOf('seller')).expect(200));
    await http()
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set(...CSRF)
      .expect(204);
    await http().get('/api/v1/auth/me').set('Cookie', cookie).expect(401);
  });

  it('logout-all revokes every session of the user', async () => {
    const a = cookieOf(await login(emailOf('seller')).expect(200));
    const b = cookieOf(await login(emailOf('seller')).expect(200));
    const res = await http()
      .post('/api/v1/auth/logout-all')
      .set('Cookie', a)
      .set(...CSRF)
      .expect(200);
    expect(res.body.revoked).toBeGreaterThanOrEqual(2);
    await http().get('/api/v1/auth/me').set('Cookie', b).expect(401);
  });

  it('expires idle sessions', async () => {
    const cookie = cookieOf(await login(emailOf('seller')).expect(200));
    await prisma.session.updateMany({
      where: { user: { email: emailOf('seller') }, revokedAt: null },
      data: { lastSeenAt: new Date(Date.now() - 3 * 3_600_000) },
    });
    await http().get('/api/v1/auth/me').set('Cookie', cookie).expect(401);
  });

  it('locks the account after repeated failures, even for the correct password, and audits it', async () => {
    for (let i = 0; i < 5; i++) await login(emailOf('lock'), 'wrong-password-123').expect(401);
    await login(emailOf('lock')).expect(401);
    const user = await prisma.user.findFirstOrThrow({ where: { email: emailOf('lock') } });
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    const actions = (await prisma.auditLog.findMany({ where: { userId: user.id } })).map(
      (a) => a.action,
    );
    expect(actions).toContain('login_failed');
    expect(actions).toContain('login_blocked');
  });

  it('supports optional TOTP two-factor: setup, enable, required on login, disable', async () => {
    const email = emailOf('twofa');
    const cookie = cookieOf(await login(email).expect(200));

    const setup = await http()
      .post('/api/v1/auth/2fa/setup')
      .set('Cookie', cookie)
      .set(...CSRF)
      .expect(200);
    expect(setup.body.otpauthUri).toContain('otpauth://totp/');
    const stored = await prisma.user.findFirstOrThrow({ where: { email } });
    expect(stored.totpSecretEnc).not.toContain(setup.body.secret);

    await http()
      .post('/api/v1/auth/2fa/enable')
      .set('Cookie', cookie)
      .set(...CSRF)
      .send({ code: '000000' })
      .expect(400);
    await http()
      .post('/api/v1/auth/2fa/enable')
      .set('Cookie', cookie)
      .set(...CSRF)
      .send({ code: totpCode(setup.body.secret) })
      .expect(204);

    const noCode = await login(email).expect(401);
    expect(noCode.body.code).toBe('totp_required');
    const badCode = await login(email, password, { totpCode: '000000' }).expect(401);
    expect(badCode.body.code).toBe('totp_invalid');
    const ok = await login(email, password, { totpCode: totpCode(setup.body.secret) }).expect(200);
    expect(ok.body.user.totpEnabled).toBe(true);

    const newCookie = cookieOf(ok);
    await http()
      .post('/api/v1/auth/2fa/disable')
      .set('Cookie', newCookie)
      .set(...CSRF)
      .send({ password, code: totpCode(setup.body.secret) })
      .expect(204);
    await login(email).expect(200);
  });

  it('reflects permission changes on the next request', async () => {
    const cookie = cookieOf(await login(emailOf('seller')).expect(200));
    const org = await prisma.organization.findFirstOrThrow({ where: { name: TEST_ORG } });
    const role = await prisma.role.findUniqueOrThrow({
      where: { organizationId_key: { organizationId: org.id, key: 'salesperson' } },
    });
    const perm = await prisma.permission.findUniqueOrThrow({
      where: { resource_action: { resource: 'accounts', action: 'read' } },
    });
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
    });
    try {
      await http().get('/api/v1/probe/allowed').set('Cookie', cookie).expect(403);
    } finally {
      await seed(prisma, TEST_ORG, { resetRoleGrants: true });
    }
    await http().get('/api/v1/probe/allowed').set('Cookie', cookie).expect(200);
  });
});
