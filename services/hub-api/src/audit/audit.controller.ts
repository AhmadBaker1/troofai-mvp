import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('meeting/:meetingId')
  async getByMeeting(@Param('meetingId') meetingId: string) {
    return this.auditService.getByMeeting(meetingId);
  }
}
