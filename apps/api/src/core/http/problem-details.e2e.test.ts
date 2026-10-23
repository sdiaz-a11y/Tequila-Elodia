import 'reflect-metadata';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { paginationQuerySchema } from '@elodia/shared';
import { AppModule } from '../../app.module';
import { configureApp } from '../../app.setup';
import { parseEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';

const bodySchema = z.object({ name: z.string().min(2) });

@Controller('probe')
class ProbeController {
  @Post('validate')
  validate(@Body(new ZodValidationPipe(bodySchema)) body: z.infer<typeof bodySchema>) {
    return body;
  }
  @Get('page')
  page(
    @Query(new ZodValidationPipe(paginationQuerySchema)) q: z.infer<typeof paginationQuerySchema>,
  ) {
    return q;
  }
  @Get('forbidden')
  forbidden() {
    throw new ForbiddenException('No tienes permiso');
  }
  @Get('boom')
  boom() {
    throw new Error('secret database password leaked in stack');
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

let failReady = false;
const prismaStub = {
  client: {
    $queryRaw: async () => {
      if (failReady) throw new Error('db down');
      return [{ '?column?': 1 }];
    },
    $disconnect: async () => undefined,
  },
};

describe('HTTP layer (RFC 7807, request id, health)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, ProbeModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, parseEnv({}));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('serves liveness under /api/v1 with security headers and a request id', async () => {
    const res = await http().get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes a well-formed client request id and replaces a malicious one', async () => {
    const ok = await http()
      .get('/api/v1/health')
      .set('x-request-id', 'client-req-12345')
      .expect(200);
    expect(ok.headers['x-request-id']).toBe('client-req-12345');
    const bad = await http()
      .get('/api/v1/health')
      .set('x-request-id', 'bad id\twith spaces')
      .expect(200);
    expect(bad.headers['x-request-id']).not.toContain(' ');
  });

  it('returns 400 problem+json with field errors for invalid bodies', async () => {
    const res = await http().post('/api/v1/probe/validate').send({ name: 'a' }).expect(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({
      status: 400,
      title: 'Solicitud inválida',
      instance: '/api/v1/probe/validate',
    });
    expect(res.body.errors).toEqual([{ path: 'name', message: expect.any(String) }]);
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('validates and coerces pagination', async () => {
    const ok = await http().get('/api/v1/probe/page?page=2&pageSize=10').expect(200);
    expect(ok.body).toEqual({ page: 2, pageSize: 10 });
    await http().get('/api/v1/probe/page?pageSize=1000').expect(400);
  });

  it('maps HttpException to problem+json', async () => {
    const res = await http().get('/api/v1/probe/forbidden').expect(403);
    expect(res.body).toMatchObject({
      status: 403,
      title: 'Acceso denegado',
      detail: 'No tienes permiso',
    });
  });

  it('returns 404 problem+json for unknown routes', async () => {
    const res = await http().get('/api/v1/nope').expect(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('never leaks internals on 500', async () => {
    const res = await http().get('/api/v1/probe/boom').expect(500);
    expect(res.body.title).toBe('Error interno');
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(res.body.detail).toBeUndefined();
  });

  it('reports readiness and degrades to 503 when the database is down', async () => {
    failReady = false;
    await http().get('/api/v1/health/ready').expect(200, { status: 'ok', database: 'up' });
    failReady = true;
    const res = await http().get('/api/v1/health/ready').expect(503);
    expect(res.body.title).toBe('Servicio no disponible');
    failReady = false;
  });
});
