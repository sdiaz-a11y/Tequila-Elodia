import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { AppEnv } from './core/config/env';

/** Cross-cutting HTTP setup shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication, env: AppEnv): void {
  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();
}
