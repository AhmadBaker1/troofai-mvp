import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [DeviceModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
