import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { healthResponseSchema, type HealthResponse } from '@elodia/shared';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'elodia-api',
      time: new Date().toISOString(),
    });
  }
}
