import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EnrollDeviceDto } from './device.dto';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async enroll(dto: EnrollDeviceDto) {
    const existing = await this.prisma.device.findUnique({
      where: { id: dto.device_id },
    });

    if (existing) {
      // Re-enrollment: update public key
      const device = await this.prisma.device.update({
        where: { id: dto.device_id },
        data: {
          publicKeyPem: dto.public_key_pem,
          keyAlgorithm: dto.key_algorithm || 'RSA-2048',
          hardwareBound: dto.hardware_bound ?? false,
          status: 'ACTIVE',
          lastHeartbeat: new Date(),
        },
      });

      await this.audit.log({
        tenantId: dto.tenant_id,
        eventType: 'DEVICE_RE_ENROLLED',
        actor: dto.user_id,
        details: {
          device_id: dto.device_id,
          hardware_bound: dto.hardware_bound,
          key_algorithm: dto.key_algorithm,
        },
      });

      this.logger.log(`Device re-enrolled: ${dto.device_id} (${dto.display_name})`);
      return device;
    }

    const device = await this.prisma.device.create({
      data: {
        id: dto.device_id,
        tenantId: dto.tenant_id,
        userId: dto.user_id,
        displayName: dto.display_name,
        publicKeyPem: dto.public_key_pem,
        keyAlgorithm: dto.key_algorithm || 'RSA-2048',
        hardwareBound: dto.hardware_bound ?? false,
        status: 'ACTIVE',
        lastHeartbeat: new Date(),
      },
    });

    await this.audit.log({
      tenantId: dto.tenant_id,
      eventType: 'DEVICE_ENROLLED',
      actor: dto.user_id,
      details: {
        device_id: dto.device_id,
        display_name: dto.display_name,
        hardware_bound: dto.hardware_bound,
        key_algorithm: dto.key_algorithm,
      },
    });

    this.logger.log(`Device enrolled: ${dto.device_id} (${dto.display_name})`);
    return device;
  }

  async heartbeat(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { lastHeartbeat: new Date() },
    });
  }

  async findById(id: string) {
    return this.prisma.device.findUnique({ where: { id } });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId },
      orderBy: { enrolledAt: 'desc' },
    });
  }
}
