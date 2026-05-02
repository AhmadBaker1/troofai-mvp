import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { DeviceModule } from './device/device.module';
import { MeetingModule } from './meeting/meeting.module';
import { ChallengeModule } from './challenge/challenge.module';
import { PolicyModule } from './policy/policy.module';
import { AuditModule } from './audit/audit.module';
import { GatewayModule } from './gateway/gateway.module';
import { StatsModule } from './stats/stats.module';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    AuditModule,
    DeviceModule,
    MeetingModule,
    PolicyModule,
    GatewayModule,
    ChallengeModule,
    StatsModule,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private authService: AuthService) {}

  async onModuleInit() {
    // Seed the demo tenant on startup
    const tenant = await this.authService.ensureDemoTenant();
    this.logger.log(`═══════════════════════════════════════════════`);
    this.logger.log(`  TroofAI Hub — Demo Tenant Ready`);
    this.logger.log(`  Tenant ID:  ${tenant.id}`);
    this.logger.log(`  API Key:    ${tenant.apiKey}`);
    this.logger.log(`═══════════════════════════════════════════════`);
  }
}
