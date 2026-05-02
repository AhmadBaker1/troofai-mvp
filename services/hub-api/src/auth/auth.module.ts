import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './auth.guard';
import { TenantController } from './tenant.controller';

@Module({
  controllers: [TenantController],
  providers: [AuthService, ApiKeyGuard],
  exports: [AuthService, ApiKeyGuard],
})
export class AuthModule {}
