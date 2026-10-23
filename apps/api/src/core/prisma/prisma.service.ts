import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, type PrismaClient } from '@elodia/database';
import { APP_ENV, type AppEnv } from '../config/env';

/**
 * Nest-managed Prisma client. Holds the real client (`service.client`) instead of subclassing
 * the generated class, so the lifecycle stays in one place.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.client = createPrismaClient(env.DATABASE_URL);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
