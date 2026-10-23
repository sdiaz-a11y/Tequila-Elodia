import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard, CsrfGuard, PermissionsGuard } from './guards';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionsService,
    CsrfGuard,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, PasswordService, SessionsService, CsrfGuard, AuthGuard, PermissionsGuard],
})
export class AuthModule {}
