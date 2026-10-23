import 'reflect-metadata';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { parseEnv } from './core/config/env';

const LOG_LEVELS = ['error', 'warn', 'log', 'debug', 'verbose'] as const;

async function bootstrap() {
  // Local development: load the repo-root .env (never committed). In production the platform injects env vars.
  const envFile = path.resolve(__dirname, '../../../.env');
  if (process.env.NODE_ENV !== 'production' && existsSync(envFile)) process.loadEnvFile(envFile);

  const env = parseEnv();
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: env.NODE_ENV === 'production',
      logLevels: [...LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(env.LOG_LEVEL) + 1)],
    }),
  });
  configureApp(app, env);

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('ELODIA OS API').setVersion('0.1.0').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.PORT);
}

void bootstrap();
