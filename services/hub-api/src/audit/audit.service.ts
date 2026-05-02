import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogInput {
  tenantId: string;
  meetingId?: string;
  eventType: string;
  actor: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    const event = await this.prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        meetingId: input.meetingId || null,
        eventType: input.eventType,
        actor: input.actor,
        details: input.details || {},
      },
    });

    this.logger.log(`[${input.eventType}] ${input.actor} — ${JSON.stringify(input.details || {})}`);
    return event;
  }

  async getByMeeting(meetingId: string) {
    return this.prisma.auditEvent.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getByTenant(tenantId: string, limit = 100) {
    return this.prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
