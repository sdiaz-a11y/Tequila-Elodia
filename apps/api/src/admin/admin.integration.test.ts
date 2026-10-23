import 'reflect-metadata';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { config as loadEnv } from 'dotenv';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '@elodia/database';
import { seed } from '@elodia/database/dist/seed';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { PasswordService } from '../auth/password.service';
import { parseEnv } from '../core/config/env';

// Each test chains several remote round-trips and argon2 verifications.
vi.setConfig({ testTimeout: 60_000 });

loadEnv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

// Real Supabase database, dedicated test organizations; skipped without a connection (e.g. CI).
// Only a per-run custom role is edited: system roles are shared with the auth tests running in parallel.
const hasDb = Boolean(process.env.DATABASE_URL);
const TEST_ORG = 'ELODIA-TEST';
const CSRF = ['x-elodia-csrf', '1'] as const;
const TEMP = /^[a-zA-Z2-9]{5}-[a-zA-Z2-9]{5}-[a-zA-Z2-9]{5}$/;

describe.skipIf(!hasDb)('administration: users, roles and audit (Supabase)', () => {
  const prisma = hasDb ? createPrismaClient() : (undefined as never);
  const passwords = new PasswordService();
  const password = `Pw-${randomBytes(9).toString('base64url')}`;
  const tag = randomUUID().slice(0, 8);
  const emailOf = (n: string) => `${n}-${tag}@elodia-test.invalid`;
  const foreignOrgName = `ELODIA-TEST-FOREIGN-${tag}`;
  let app: INestApplication;
  let orgId: string;
  let customRoleId: string;
  let foreign: { orgId: string; userId: string; roleId: string };

  const http = () => request(app.getHttpServer());
  const login = (email: string, pw = password) =>
    http()
      .post('/api/v1/auth/login')
      .set(...CSRF)
      .send({ email, password: pw });
  const cookieOf = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  const as = async (name: string) => cookieOf(await login(emailOf(name)).expect(200));
  const get = (url: string, cookie: string) => http().get(`/api/v1${url}`).set('Cookie', cookie);
  const send = (method: 'post' | 'patch' | 'put', url: string, cookie: string, body?: object) => {
    const req = http()[method](`/api/v1${url}`);
    return req
      .set('Cookie', cookie)
      .set(...CSRF)
      .send(body);
  };

  const roleId = async (key: string) =>
    (
      await prisma.role.findUniqueOrThrow({
        where: { organizationId_key: { organizationId: orgId, key } },
      })
    ).id;
  const permissionId = async (resource: string, action: string) =>
    (
      await prisma.permission.findUniqueOrThrow({
        where: { resource_action: { resource, action } },
      })
    ).id;

  async function createUser(name: string, roleKey: string, extra: object = {}) {
    return prisma.user.create({
      data: {
        organizationId: orgId,
        email: emailOf(name),
        name,
        status: 'active',
        passwordHash: await passwords.hash(password),
        roles: { create: { roleId: await roleId(roleKey) } },
        ...extra,
      },
    });
  }

  beforeAll(async () => {
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    process.env.LOGIN_RATE_LIMIT = '1000';
    await seed(prisma, TEST_ORG);
    orgId = (await prisma.organization.findFirstOrThrow({ where: { name: TEST_ORG } })).id;

    await createUser('root', 'tech_superadmin');
    await createUser('ops', 'ops_admin');
    await createUser('seller', 'salesperson');
    await createUser('victim', 'collaborator');
    await createUser('lockme', 'collaborator');

    // A custom (non-system) role starting with one permission the ops admin does not hold.
    const custom = await prisma.role.create({
      data: { organizationId: orgId, key: `custom-${tag}`, name: `Custom ${tag}`, isSystem: false },
    });
    customRoleId = custom.id;
    await prisma.rolePermission.create({
      data: {
        roleId: custom.id,
        permissionId: await permissionId('accounts', 'read'),
        scope: 'own',
      },
    });

    // A second organization the test admins must never reach.
    const org2 = await prisma.organization.create({ data: { name: foreignOrgName } });
    const role2 = await prisma.role.create({
      data: { organizationId: org2.id, key: 'foreign-role', name: 'Foreign', isSystem: false },
    });
    const user2 = await prisma.user.create({
      data: {
        organizationId: org2.id,
        email: emailOf('foreign'),
        name: 'Foreign',
        status: 'active',
      },
    });
    foreign = { orgId: org2.id, userId: user2.id, roleId: role2.id };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, parseEnv());
    await app.init();
  }, 90_000);

  afterAll(async () => {
    await app?.close();
    await prisma?.session.deleteMany({
      where: { user: { email: { endsWith: `-${tag}@elodia-test.invalid` } } },
    });
    // Nothing audited ever touched the foreign org, so it can be removed completely.
    if (foreign) {
      await prisma.user
        .deleteMany({ where: { organizationId: foreign.orgId } })
        .catch(() => undefined);
      await prisma.role
        .deleteMany({ where: { organizationId: foreign.orgId } })
        .catch(() => undefined);
      await prisma.organization.deleteMany({ where: { id: foreign.orgId } }).catch(() => undefined);
    }
    await prisma?.$disconnect();
  });

  describe('permissions on the admin endpoints', () => {
    it('denies users without users/roles/audit permissions', async () => {
      const cookie = await as('seller');
      await get('/users', cookie).expect(403);
      await get('/roles', cookie).expect(403);
      await get('/audit-logs', cookie).expect(403);
      await get('/audit-logs/export.csv', cookie).expect(403);
      await send('post', '/users', cookie, {
        email: 'x@y.mx',
        name: 'Xx',
        roleId: customRoleId,
      }).expect(403);
    });

    it('requires a session', async () => {
      await http().get('/api/v1/users').expect(401);
      await http().get('/api/v1/audit-logs/export.csv').expect(401);
    });

    it('lists only the own organization and never exposes secrets', async () => {
      const res = await get('/users?pageSize=100', await as('ops')).expect(200);
      const emails: string[] = res.body.data.map((u: { email: string }) => u.email);
      expect(emails).toContain(emailOf('seller'));
      expect(emails).not.toContain(emailOf('foreign'));
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
      expect(JSON.stringify(res.body)).not.toMatch(
        /passwordHash|password_hash|totpSecret|"password"/i,
      );
    });

    it('filters and paginates', async () => {
      const cookie = await as('ops');
      const found = await get(`/users?q=${encodeURIComponent(emailOf('victim'))}`, cookie).expect(
        200,
      );
      expect(found.body.data).toHaveLength(1);
      const page = await get('/users?pageSize=2&page=1', cookie).expect(200);
      expect(page.body.data.length).toBeLessThanOrEqual(2);
      await get('/users?pageSize=1000', cookie).expect(400);
      await get('/users?status=bogus', cookie).expect(400);
    });
  });

  describe('creating users and the temporary password flow', () => {
    const newEmail = () => emailOf('newbie');
    let tempPassword = '';
    let newUserId = '';

    it('creates a user with a one-time temporary password that is not stored in clear or audited', async () => {
      const cookie = await as('ops');
      const res = await send('post', '/users', cookie, {
        email: newEmail().toUpperCase(),
        name: 'Nueva Persona',
        roleId: await roleId('salesperson'),
      }).expect(201);
      tempPassword = res.body.temporaryPassword;
      newUserId = res.body.user.id;
      expect(tempPassword).toMatch(TEMP);
      expect(res.body.user).toMatchObject({
        email: newEmail(),
        mustChangePassword: true,
        status: 'active',
      });

      const row = await prisma.user.findUniqueOrThrow({ where: { id: newUserId } });
      expect(row.passwordHash).not.toContain(tempPassword);
      const audits = await prisma.auditLog.findMany({ where: { resourceId: newUserId } });
      expect(audits.map((a) => a.action)).toContain('create');
      expect(JSON.stringify(audits)).not.toContain(tempPassword);
    });

    it('rejects duplicates, unknown roles and roles of another organization', async () => {
      const cookie = await as('ops');
      const body = { email: newEmail(), name: 'Dup', roleId: await roleId('salesperson') };
      await send('post', '/users', cookie, body).expect(409);
      await send('post', '/users', cookie, {
        ...body,
        email: emailOf('x1'),
        roleId: randomUUID(),
      }).expect(404);
      await send('post', '/users', cookie, {
        ...body,
        email: emailOf('x2'),
        roleId: foreign.roleId,
      }).expect(404);
      await send('post', '/users', cookie, { ...body, email: 'not-an-email' }).expect(400);
    });

    it('blocks privilege escalation: elevated roles need the same permissions, ordinary roles do not', async () => {
      const cookie = await as('ops');
      for (const key of ['tech_superadmin', 'director_vp']) {
        await send('post', '/users', cookie, {
          email: emailOf(`esc-${key}`),
          name: 'Escalada',
          roleId: await roleId(key),
        }).expect(403);
      }
      // …but a superadmin can.
      await send('post', '/users', await as('root'), {
        email: emailOf('vp'),
        name: 'Dirección',
        roleId: await roleId('director_vp'),
      }).expect(201);
    });

    it('limits a temporary-password session to changing the password', async () => {
      const cookie = cookieOf(await login(newEmail(), tempPassword).expect(200));
      const me = await get('/auth/me', cookie).expect(200);
      expect(me.body.user.mustChangePassword).toBe(true);

      const blocked = await get('/users', cookie).expect(403);
      expect(blocked.body.code).toBe('password_change_required');
      await get('/roles', cookie).expect(403);
      await send('post', '/users', cookie, {}).expect(403);

      // Validation and checks on the change itself.
      await send('post', '/auth/change-password', cookie, {
        currentPassword: 'wrong-wrong-12',
        newPassword: `${password}x`,
      }).expect(400);
      await send('post', '/auth/change-password', cookie, {
        currentPassword: tempPassword,
        newPassword: 'short',
      }).expect(400);
      await send('post', '/auth/change-password', cookie, {
        currentPassword: tempPassword,
        newPassword: tempPassword,
      }).expect(400);

      const other = cookieOf(await login(newEmail(), tempPassword).expect(200));
      await send('post', '/auth/change-password', cookie, {
        currentPassword: tempPassword,
        newPassword: `${password}-new`,
      }).expect(204);

      // Same session keeps working and is free; the other session and the temporary password are dead.
      const after = await get('/auth/me', cookie).expect(200);
      expect(after.body.user.mustChangePassword).toBe(false);
      await get('/auth/me', other).expect(401);
      await login(newEmail(), tempPassword).expect(401);
      await login(newEmail(), `${password}-new`).expect(200);

      const actions = (await prisma.auditLog.findMany({ where: { userId: newUserId } })).map(
        (a) => a.action,
      );
      expect(actions).toContain('change_password');
    });
  });

  describe('managing existing users', () => {
    it('updates the name and role, and a role change takes effect immediately', async () => {
      const cookie = await as('ops');
      const victim = await prisma.user.findFirstOrThrow({ where: { email: emailOf('victim') } });
      const victimCookie = await as('victim');
      await get('/users', victimCookie).expect(403);

      const withUsersRead = await send('put', `/roles/${customRoleId}/permissions`, cookie, {
        grants: [{ resource: 'users', action: 'read', scope: 'all' }],
      }).expect(200);
      expect(withUsersRead.body.grants).toHaveLength(1);

      const res = await send('patch', `/users/${victim.id}`, cookie, {
        name: 'Víctima Renombrada',
        roleId: customRoleId,
      }).expect(200);
      expect(res.body.name).toBe('Víctima Renombrada');
      expect(res.body.roles[0].id).toBe(customRoleId);
      await get('/users', victimCookie).expect(200);

      // Back to a plain role: access disappears on the very next request.
      await send('patch', `/users/${victim.id}`, cookie, {
        roleId: await roleId('collaborator'),
      }).expect(200);
      await get('/users', victimCookie).expect(403);
    });

    it('disabling ends sessions and blocks login; enabling restores access', async () => {
      const cookie = await as('ops');
      const victim = await prisma.user.findFirstOrThrow({ where: { email: emailOf('victim') } });
      const victimCookie = await as('victim');
      await send('patch', `/users/${victim.id}`, cookie, { status: 'disabled' }).expect(200);
      await get('/auth/me', victimCookie).expect(401);
      await login(emailOf('victim')).expect(401);
      await send('patch', `/users/${victim.id}`, cookie, { status: 'active' }).expect(200);
      await login(emailOf('victim')).expect(200);
    });

    it('refuses self-demotion, higher-privilege targets and other organizations', async () => {
      const ops = await prisma.user.findFirstOrThrow({ where: { email: emailOf('ops') } });
      const root = await prisma.user.findFirstOrThrow({ where: { email: emailOf('root') } });
      const cookie = await as('ops');
      await send('patch', `/users/${ops.id}`, cookie, { status: 'disabled' }).expect(403);
      await send('patch', `/users/${ops.id}`, cookie, {
        roleId: await roleId('collaborator'),
      }).expect(403);
      await send('patch', `/users/${root.id}`, cookie, { name: 'Intento' }).expect(403);
      await send('post', `/users/${root.id}/reset-password`, cookie).expect(403);
      await send('patch', `/users/${foreign.userId}`, cookie, { name: 'Cross tenant' }).expect(404);
      await send('post', `/users/${foreign.userId}/reset-password`, cookie).expect(404);
      await send('post', `/users/${randomUUID()}/unlock`, cookie).expect(404);
      await send('patch', '/users/not-a-uuid', cookie, { name: 'Xx' }).expect(400);
      await send('patch', `/users/${root.id}`, cookie, {}).expect(400);
    });

    it('reset-password issues a new temporary password and ends the target sessions', async () => {
      const cookie = await as('ops');
      const seller = await prisma.user.findFirstOrThrow({ where: { email: emailOf('seller') } });
      const sellerCookie = await as('seller');

      const res = await send('post', `/users/${seller.id}/reset-password`, cookie).expect(200);
      expect(res.body.temporaryPassword).toMatch(TEMP);
      expect(res.body.user.mustChangePassword).toBe(true);
      await get('/auth/me', sellerCookie).expect(401);
      await login(emailOf('seller')).expect(401);
      await login(emailOf('seller'), res.body.temporaryPassword).expect(200);

      const log = await prisma.auditLog.findMany({
        where: { resourceId: seller.id, action: 'reset_password' },
      });
      expect(log.length).toBeGreaterThan(0);
      expect(JSON.stringify(log)).not.toContain(res.body.temporaryPassword);

      // Self-service goes through "change password", not an admin reset.
      const ops = await prisma.user.findFirstOrThrow({ where: { email: emailOf('ops') } });
      await send('post', `/users/${ops.id}/reset-password`, cookie).expect(403);
    });

    it('unlock clears a progressive lock', async () => {
      const cookie = await as('ops');
      const target = await prisma.user.findFirstOrThrow({ where: { email: emailOf('lockme') } });
      for (let i = 0; i < 5; i++) await login(emailOf('lockme'), 'wrong-password-123').expect(401);
      await login(emailOf('lockme')).expect(401);
      const listed = await get(`/users?q=${encodeURIComponent(emailOf('lockme'))}`, cookie).expect(
        200,
      );
      expect(listed.body.data[0].lockedUntil).not.toBeNull();

      const res = await send('post', `/users/${target.id}/unlock`, cookie).expect(200);
      expect(res.body.lockedUntil).toBeNull();
      await login(emailOf('lockme')).expect(200);
    });
  });

  describe('roles and the permission matrix', () => {
    it('lists the system roles with user and permission counts', async () => {
      const res = await get('/roles', await as('ops')).expect(200);
      const keys: string[] = res.body.map((r: { key: string }) => r.key);
      expect(keys.slice(0, 10)).toEqual([
        'tech_superadmin',
        'director_vp',
        'ops_admin',
        'sales_manager',
        'salesperson',
        'marketing',
        'operations',
        'finance',
        'collaborator',
        'external_distributor',
      ]);
      expect(res.body[0]).toMatchObject({ isSystem: true });
      expect(res.body[0].grantCount).toBeGreaterThan(100);
    });

    it('returns the grants of a role', async () => {
      const res = await get(`/roles/${await roleId('collaborator')}`, await as('ops')).expect(200);
      expect(res.body.grants).toContainEqual({ resource: 'tasks', action: 'update', scope: 'own' });
      await get(`/roles/${foreign.roleId}`, await as('ops')).expect(404);
    });

    it('edits a role and records a readable diff in the audit log', async () => {
      const cookie = await as('ops');
      const res = await send('put', `/roles/${customRoleId}/permissions`, cookie, {
        grants: [
          { resource: 'users', action: 'read', scope: 'all' },
          { resource: 'roles', action: 'read', scope: 'all' },
        ],
      }).expect(200);
      expect(res.body.grantCount).toBe(2);
      const log = await prisma.auditLog.findFirstOrThrow({
        where: { resourceId: customRoleId, action: 'update_grants' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log.after).toMatchObject({ added: ['roles:read:all'] });
    });

    it('applies a permission change to holders of the role on their next request', async () => {
      const cookie = await as('ops');
      const holder = await prisma.user.findFirstOrThrow({ where: { email: emailOf('lockme') } });
      await send('patch', `/users/${holder.id}`, cookie, { roleId: customRoleId }).expect(200);
      const holderCookie = await as('lockme');
      await get('/roles', holderCookie).expect(200);
      await send('put', `/roles/${customRoleId}/permissions`, cookie, {
        grants: [{ resource: 'users', action: 'read', scope: 'all' }],
      }).expect(200);
      await get('/roles', holderCookie).expect(403);
      await get('/users', holderCookie).expect(200);
    });

    it('blocks granting permissions the editor does not hold, but allows removing them', async () => {
      const cookie = await as('ops');
      // ops_admin does not hold tasks:*, so it cannot hand it out…
      await send('put', `/roles/${customRoleId}/permissions`, cookie, {
        grants: [{ resource: 'tasks', action: 'read', scope: 'all' }],
      }).expect(403);
      // …nor widen a scope beyond its own (users:read is "all", roles:update is "all": narrowing is fine).
      await send('put', `/roles/${customRoleId}/permissions`, cookie, { grants: [] }).expect(200);
      // A superadmin can grant anything.
      await send('put', `/roles/${customRoleId}/permissions`, await as('root'), {
        grants: [{ resource: 'tasks', action: 'read', scope: 'all' }],
      }).expect(200);
    });

    it('never lets the superadmin role be edited, and validates the payload', async () => {
      const root = await as('root');
      const superRole = await roleId('tech_superadmin');
      await send('put', `/roles/${superRole}/permissions`, root, { grants: [] }).expect(403);
      await send('post', `/roles/${superRole}/reset-defaults`, root).expect(403);
      await send('put', `/roles/${customRoleId}/permissions`, root, {
        grants: [{ resource: 'nope', action: 'read', scope: 'all' }],
      }).expect(400);
      await send('put', `/roles/${customRoleId}/permissions`, root, {
        grants: [
          { resource: 'users', action: 'read', scope: 'all' },
          { resource: 'users', action: 'read', scope: 'own' },
        ],
      }).expect(400);
      await send('put', `/roles/${foreign.roleId}/permissions`, root, { grants: [] }).expect(404);
    });

    it('reset-defaults only applies to system roles and is a no-op when already default', async () => {
      const root = await as('root');
      await send('post', `/roles/${customRoleId}/reset-defaults`, root).expect(400);
      const collaborator = await roleId('collaborator');
      const before = await prisma.auditLog.count({ where: { resourceId: collaborator } });
      const res = await send('post', `/roles/${collaborator}/reset-defaults`, root).expect(200);
      expect(res.body.grants.length).toBeGreaterThan(0);
      expect(await prisma.auditLog.count({ where: { resourceId: collaborator } })).toBe(before);
    });
  });

  describe('audit log', () => {
    it('lists, filters by action/resource and paginates, newest first', async () => {
      const cookie = await as('ops');
      const all = await get('/audit-logs?pageSize=5', cookie).expect(200);
      expect(all.body.data).toHaveLength(5);
      const dates: string[] = all.body.data.map((r: { createdAt: string }) => r.createdAt);
      expect([...dates].sort().reverse()).toEqual(dates);

      const creates = await get(
        '/audit-logs?action=create&resource=users&pageSize=100',
        cookie,
      ).expect(200);
      expect(creates.body.data.length).toBeGreaterThan(0);
      for (const r of creates.body.data)
        expect(r).toMatchObject({ action: 'create', resource: 'users' });
      const authors = creates.body.data.map(
        (r: { user: { email: string } | null }) => r.user?.email,
      );
      expect(authors).toContain(emailOf('ops'));

      const byUser = await get(
        `/audit-logs?q=${encodeURIComponent(emailOf('ops'))}&pageSize=100`,
        cookie,
      ).expect(200);
      expect(byUser.body.meta.total).toBeGreaterThan(0);
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const none = await get(`/audit-logs?from=${encodeURIComponent(future)}`, cookie).expect(200);
      expect(none.body.meta.total).toBe(0);
      await get('/audit-logs?from=not-a-date', cookie).expect(400);
    });

    it('only shows the own organization', async () => {
      const res = await get('/audit-logs?pageSize=100&resource=users', await as('ops')).expect(200);
      const ids = new Set<string>(res.body.data.map((r: { resourceId: string }) => r.resourceId));
      expect(ids.has(foreign.userId)).toBe(false);
    });

    it('exports a CSV, itself audited, that neutralises formulas and carries no secrets', async () => {
      const cookie = await as('ops');
      const before = await prisma.auditLog.count({
        where: { resource: 'audit', action: 'export' },
      });
      const res = await get('/audit-logs/export.csv?resource=users', cookie).expect(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['cache-control']).toBe('no-store');
      const csv = res.text;
      expect(
        csv.startsWith('﻿fecha,usuario,correo,accion,recurso,id_recurso,ip,antes,despues'),
      ).toBe(true);
      expect(csv.split('\r\n').length).toBeGreaterThan(2);
      expect(csv).not.toMatch(/passwordHash|password_hash|temporaryPassword/);
      expect(await prisma.auditLog.count({ where: { resource: 'audit', action: 'export' } })).toBe(
        before + 1,
      );
    });
  });
});
