import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { CreateMeetingDto, AddParticipantDto, RequestJoinTokenDto, BindDeviceDto } from './meeting.dto';

@Controller('meetings')
export class MeetingController {
  constructor(private meetingService: MeetingService) {}

  @Post()
  async create(@Body() dto: CreateMeetingDto) {
    const meeting = await this.meetingService.create(dto);
    return { success: true, meeting };
  }

  @Get()
  async listMeetings(@Query('tenant_id') tenantId: string) {
    if (!tenantId) return [];
    return this.meetingService.listByTenant(tenantId);
  }

  @Get(':id')
  async getMeeting(@Param('id') id: string) {
    return this.meetingService.getMeeting(id);
  }

  @Post(':id/participants')
  async addParticipant(@Param('id') meetingId: string, @Body() dto: AddParticipantDto) {
    const participant = await this.meetingService.addParticipant(meetingId, dto);
    return { success: true, participant };
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') meetingId: string) {
    return this.meetingService.getParticipants(meetingId);
  }

  @Post(':id/join-token')
  async issueJoinToken(@Param('id') meetingId: string, @Body() dto: RequestJoinTokenDto) {
    return this.meetingService.issueJoinToken(meetingId, dto.participant_id);
  }

  @Post(':id/bind')
  async bindDevice(@Param('id') meetingId: string, @Body() dto: BindDeviceDto) {
    const participant = await this.meetingService.bindDevice(
      meetingId,
      dto.join_token,
      dto.device_id,
      dto.signature,
    );
    return { success: true, participant };
  }
}
