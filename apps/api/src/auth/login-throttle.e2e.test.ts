import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { parseEnv } from '../core/config/env';
import { PrismaService } from '../core/prisma/prisma.service';

// No database needed: the user lookup is stubbed to "nobody", so every attempt is a plain 401.
const prismaStub = {
  client: { user: { findMany: async () => [] }, $disconnect: async () => undefined },
};

describe('login rate limiting', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.LOGIN_RATE_LIMIT = '3';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, parseEnv());
    await app.init();
  });
  afterAll(async () => {
    delete process.env.LOGIN_RATE_LIMIT;
    await app.close();
  });

  const attempt = () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-elodia-csrf', '1')
      .send({ email: 'nobody@elodia-test.invalid', password: 'whatever-password' });

  it('answers 429 after the configured number of attempts, only on the login route', async () => {
    for (let i = 0; i < 3; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(blocked.body.title).toBe('Demasiadas solicitudes');
    // Other routes are not affected by the login throttler.
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
});
