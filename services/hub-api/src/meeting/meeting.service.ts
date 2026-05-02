import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { CreateMeetingDto, AddParticipantDto } from './meeting.dto';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateMeetingDto) {
    const meeting = await this.prisma.meeting.create({
      data: {
        tenantId: dto.tenant_id,
        name: dto.name,
      },
    });

    await this.audit.log({
      tenantId: dto.tenant_id,
      meetingId: meeting.id,
      eventType: 'MEETING_CREATED',
      actor: 'system',
      details: { name: dto.name },
    });

    this.logger.log(`Meeting created: ${meeting.id} (${dto.name})`);
    return meeting;
  }

  async addParticipant(meetingId: string, dto: AddParticipantDto) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const participant = await this.prisma.meetingParticipant.create({
      data: {
        meetingId,
        userId: dto.user_id,
        displayName: dto.display_name,
        trustStatus: 'UNKNOWN',
      },
    });

    await this.audit.log({
      tenantId: meeting.tenantId,
      meetingId,
      eventType: 'PARTICIPANT_JOINED',
      actor: dto.user_id,
      details: { display_name: dto.display_name, participant_id: participant.id },
    });

    this.logger.log(`Participant joined: ${dto.display_name} → meeting ${meetingId}`);
    return participant;
  }

  async issueJoinToken(meetingId: string, participantId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const joinToken = randomUUID();
    const expiresAt = new Date(Date.now() + 30_000).toISOString(); // 30s

    await this.redis.set(
      `join_token:${joinToken}`,
      JSON.stringify({
        meeting_id: meetingId,
        participant_id: participantId,
        expires_at: expiresAt,
      }),
      30,
    );

    this.logger.log(`Join token issued for participant ${participantId} in meeting ${meetingId}`);
    return {
      join_token: joinToken,
      meeting_id: meetingId,
      participant_id: participantId,
      expires_at: expiresAt,
    };
  }

  async bindDevice(meetingId: string, joinToken: string, deviceId: string, signature: string) {
    // Fetch and validate join token
    const tokenData = await this.redis.get(`join_token:${joinToken}`);
    if (!tokenData) {
      throw new BadRequestException('Join token expired or invalid');
    }

    const parsed = JSON.parse(tokenData);
    if (parsed.meeting_id !== meetingId) {
      throw new BadRequestException('Meeting ID mismatch');
    }

    // Fetch device
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new BadRequestException('Device not found — not enrolled');
    }

    // Verify signature per SPEC.md section 3c
    // Signed material: join_token\nmeeting_id\nparticipant_id\ndevice_id\nexpires_at
    const signedMaterial = [
      joinToken,
      meetingId,
      parsed.participant_id,
      deviceId,
      parsed.expires_at,
    ].join('\n');

    const verifier = crypto.createVerify('SHA256');
    verifier.update(signedMaterial);

    let isValid: boolean;
    try {
      isValid = verifier.verify(device.publicKeyPem, Buffer.from(signature, 'base64'));
    } catch (err) {
      this.logger.error(`Bind signature verification error: ${err.message}`);
      isValid = false;
    }

    if (!isValid) {
      throw new BadRequestException('Invalid binding signature');
    }

    // Delete token (one-time use)
    await this.redis.del(`join_token:${joinToken}`);

    // Bind participant ↔ device
    const participant = await this.prisma.meetingParticipant.update({
      where: { id: parsed.participant_id },
      data: {
        deviceId,
        boundAt: new Date(),
        trustStatus: 'VERIFIED',
        statusReason: `Device bound and enrolled${device.hardwareBound ? ' (hardware-backed)' : ''}`,
      },
    });

    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    await this.audit.log({
      tenantId: meeting.tenantId,
      meetingId,
      eventType: 'DEVICE_BOUND',
      actor: device.userId,
      details: {
        participant_id: parsed.participant_id,
        device_id: deviceId,
        hardware_bound: device.hardwareBound,
      },
    });

    this.logger.log(`Device ${deviceId} bound to participant ${parsed.participant_id} in meeting ${meetingId}`);
    return participant;
  }

  async getMeeting(id: string) {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: {
          include: { device: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
  }

  async getParticipants(meetingId: string) {
    return this.prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: { device: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async listByTenant(tenantId: string) {
    return this.prisma.meeting.findMany({
      where: { tenantId },
      include: {
        participants: {
          select: {
            id: true,
            displayName: true,
            trustStatus: true,
            userId: true,
            deviceId: true,
          },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
