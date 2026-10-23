import { Global, Module } from '@nestjs/common';
import { APP_ENV, parseEnv } from './env';

@Global()
@Module({
  providers: [{ provide: APP_ENV, useFactory: () => parseEnv() }],
  exports: [APP_ENV],
})
export class ConfigModule {}
