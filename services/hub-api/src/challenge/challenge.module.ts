import { Module, OnModuleInit } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { DeviceModule } from '../device/device.module';
import { PolicyModule } from '../policy/policy.module';
import { AuditModule } from '../audit/audit.module';
import { GatewayModule } from '../gateway/gateway.module';
import { EventsGateway } from '../gateway/events.gateway';

@Module({
  imports: [DeviceModule, PolicyModule, AuditModule, GatewayModule],
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule implements OnModuleInit {
  constructor(
    private gateway: EventsGateway,
    private challengeService: ChallengeService,
  ) {}

  /**
   * Wire up the circular dependency between EventsGateway and ChallengeService.
   * Gateway needs ChallengeService to handle `challenge:response` messages.
   * ChallengeService needs Gateway to emit updates.
   * Resolved via lazy setter injection after both are instantiated.
   */
  onModuleInit() {
    this.gateway.setChallengeService(this.challengeService);
  }
}
