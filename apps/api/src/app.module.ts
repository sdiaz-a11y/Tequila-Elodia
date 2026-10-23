import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './core/audit/audit.module';
import { ConfigModule } from './core/config/config.module';
import { LoggingInterceptor } from './core/http/logging.interceptor';
import { ProblemDetailsFilter } from './core/http/problem-details.filter';
import { RequestIdMiddleware } from './core/http/request-id.middleware';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
