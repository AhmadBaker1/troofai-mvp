import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { DeviceService } from './device.service';
import { EnrollDeviceDto } from './device.dto';

@Controller('devices')
export class DeviceController {
  constructor(private deviceService: DeviceService) {}

  @Post('enroll')
  async enroll(@Body() dto: EnrollDeviceDto) {
    const device = await this.deviceService.enroll(dto);
    return {
      success: true,
      device_id: device.id,
      status: device.status,
      enrolled_at: device.enrolledAt,
    };
  }

  @Get()
  async listByTenant(@Query('tenant_id') tenantId: string) {
    if (!tenantId) return [];
    return this.deviceService.findByTenant(tenantId);
  }

  @Get(':id')
  async getDevice(@Param('id') id: string) {
    return this.deviceService.findById(id);
  }
}
