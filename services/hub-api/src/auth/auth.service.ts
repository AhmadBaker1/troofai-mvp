import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ensures a demo tenant exists for the MVP.
   * Returns the existing or newly created tenant.
   */
  async ensureDemoTenant() {
    const existing = await this.prisma.tenant.findFirst({
      where: { name: 'TroofAI Demo' },
    });

    if (existing) {
      this.logger.log(`Demo tenant exists: ${existing.id} (API key: ${existing.apiKey})`);
      return existing;
    }

    const apiKey = `troofai-demo-${randomBytes(16).toString('hex')}`;
    const tenant = await this.prisma.tenant.create({
      data: {
        name: 'TroofAI Demo',
        apiKey,
      },
    });

    this.logger.log(`Demo tenant created: ${tenant.id} (API key: ${tenant.apiKey})`);
    return tenant;
  }
}
