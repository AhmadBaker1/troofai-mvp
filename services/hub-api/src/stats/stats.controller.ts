import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('stats')
export class StatsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getStats(@Query('tenant_id') tenantId?: string) {
    const where = tenantId ? { tenantId } : {};

    const [
      totalDevices,
      activeDevices,
      hwBoundDevices,
      totalMeetings,
      totalParticipants,
      verifiedParticipants,
      failedParticipants,
      totalAuditEvents,
    ] = await Promise.all([
      this.prisma.device.count({ where }),
      this.prisma.device.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.device.count({ where: { ...where, hardwareBound: true } }),
      this.prisma.meeting.count({ where }),
      this.prisma.meetingParticipant.count(),
      this.prisma.meetingParticipant.count({ where: { trustStatus: 'VERIFIED' } }),
      this.prisma.meetingParticipant.count({ where: { trustStatus: 'FAILED' } }),
      this.prisma.auditEvent.count({ where }),
    ]);

    const verifiedRate = totalParticipants > 0
      ? Math.round((verifiedParticipants / totalParticipants) * 100)
      : 0;

    return {
      devices: {
        total: totalDevices,
        active: activeDevices,
        hardware_bound: hwBoundDevices,
      },
      meetings: {
        total: totalMeetings,
      },
      participants: {
        total: totalParticipants,
        verified: verifiedParticipants,
        failed: failedParticipants,
        verified_rate: verifiedRate,
      },
      audit_events: totalAuditEvents,
      threats_detected: failedParticipants,
    };
  }
}
