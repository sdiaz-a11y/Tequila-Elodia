import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { AuthGuard, CsrfGuard, PermissionsGuard } from './auth/guards';
import { AuditModule } from './core/audit/audit.module';
import { ConfigModule } from './core/config/config.module';
import { APP_ENV, type AppEnv } from './core/config/env';
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
    ThrottlerModule.forRootAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => [
        { name: 'default', ttl: 60_000, limit: 120 },
        {
          // Brute-force protection: applies only to POST /auth/login, per client IP.
          name: 'login',
          ttl: 60_000,
          limit: env.LOGIN_RATE_LIMIT,
          skipIf: (ctx) =>
            ctx.getClass() !== AuthController ||
            ctx.getHandler() !== AuthController.prototype.login,
        },
      ],
    }),
    AuthModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    // Order matters: rate limit → CSRF → session → permission (deny-by-default).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
