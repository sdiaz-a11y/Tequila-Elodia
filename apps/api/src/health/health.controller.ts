import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { healthResponseSchema, type HealthResponse } from '@elodia/shared';
import { Public } from '../auth/auth.types';
import { PrismaService } from '../core/prisma/prisma.service';

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up. Does not touch dependencies. */
  @Get()
  check(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'elodia-api',
      time: new Date().toISOString(),
    });
  }

  /** Readiness: the database answers. */
  @Get('ready')
  async ready(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('La base de datos no responde.');
    }
    return { status: 'ok', database: 'up' };
  }
}
