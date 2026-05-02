import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { DeviceService } from '../device/device.service';
import { PolicyService } from '../policy/policy.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../gateway/events.gateway';
import { randomUUID, randomBytes, createVerify } from 'crypto';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private deviceService: DeviceService,
    private policyService: PolicyService,
    private audit: AuditService,
    private gateway: EventsGateway,
  ) {}

  /**
   * Issue challenges to all participants in a meeting.
   * Participants without a device binding immediately fail.
   */
  async issueChallenge(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      this.logger.warn(`Meeting ${meetingId} not found`);
      return [];
    }

    const participants = await this.prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: { device: true },
    });

    const results = [];

    for (const participant of participants) {
      if (!participant.deviceId || !participant.device) {
        // No device bound — cannot verify
        await this.prisma.meetingParticipant.update({
          where: { id: participant.id },
          data: {
            trustStatus: 'FAILED',
            statusReason: 'No device binding — cannot verify',
            lastChallengeAt: new Date(),
          },
        });

        await this.audit.log({
          tenantId: meeting.tenantId,
          meetingId,
          eventType: 'CHALLENGE_NO_DEVICE',
          actor: participant.userId,
          details: {
            participant_id: participant.id,
            display_name: participant.displayName,
            reason: 'No device binding',
          },
        });

        this.gateway.emitMeetingUpdate(meetingId, {
          participant_id: participant.id,
          trust_status: 'FAILED',
          reason: 'No device binding — cannot verify',
        });

        results.push({
          participant_id: participant.id,
          display_name: participant.displayName,
          status: 'FAILED',
          reason: 'No device binding',
        });
        continue;
      }

      // Issue challenge to bound device
      const challengeId = randomUUID();
      const nonce = randomBytes(32).toString('base64');
      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 10_000).toISOString(); // 10s TTL

      const challengePayload = {
        challenge_id: challengeId,
        nonce,
        meeting_id: meetingId,
        participant_id: participant.id,
        issued_at: issuedAt,
        expires_at: expiresAt,
      };

      // Store in Redis with 15s TTL (10s expiry + 5s grace for network)
      await this.redis.set(
        `challenge:${challengeId}`,
        JSON.stringify({
          ...challengePayload,
          tenant_id: meeting.tenantId,
          device_id: participant.deviceId,
          user_id: participant.userId,
        }),
        15,
      );

      // Send to agent via WebSocket
      this.gateway.emitChallengeToDevice(participant.deviceId, challengePayload);

      await this.audit.log({
        tenantId: meeting.tenantId,
        meetingId,
        eventType: 'CHALLENGE_ISSUED',
        actor: 'system',
        details: {
          challenge_id: challengeId,
          participant_id: participant.id,
          display_name: participant.displayName,
          device_id: participant.deviceId,
        },
      });

      results.push({
        participant_id: participant.id,
        display_name: participant.displayName,
        status: 'CHALLENGE_SENT',
        challenge_id: challengeId,
      });
    }

    this.logger.log(`Challenges issued for meeting ${meetingId}: ${results.length} participants`);
    return results;
  }

  /**
   * Verify a challenge response from a device agent.
   * Per SPEC.md section 4d.
   */
  async verifyResponse(challengeId: string, deviceId: string, signature: string) {
    // Step 1: Fetch challenge from Redis
    const challengeData = await this.redis.get(`challenge:${challengeId}`);
    if (!challengeData) {
      this.logger.warn(`Challenge ${challengeId} not found or expired`);
      return { valid: false, status: 'FAILED', reason: 'Challenge expired or not found' };
    }

    const challenge = JSON.parse(challengeData);

    // Step 2: Check expiry
    const isExpired = new Date() > new Date(challenge.expires_at);

    // Step 3: Check device matches
    if (challenge.device_id !== deviceId) {
      this.logger.warn(`Device mismatch: expected ${challenge.device_id}, got ${deviceId}`);
      return { valid: false, status: 'FAILED', reason: 'Device ID mismatch' };
    }

    // Step 4: Fetch device
    const device = await this.deviceService.findById(deviceId);
    if (!device) {
      return { valid: false, status: 'FAILED', reason: 'Device not found' };
    }

    // Step 5: Construct canonical signing string per SPEC.md section 4b
    const signedMaterial = [
      'troofai-v1',
      challenge.challenge_id,
      challenge.tenant_id,
      challenge.device_id,
      challenge.user_id,
      challenge.meeting_id,
      challenge.participant_id,
      challenge.nonce,
      challenge.issued_at,
      challenge.expires_at,
    ].join('\n');

    // Step 6: Verify RSA-SHA256 signature
    const verifier = createVerify('SHA256');
    verifier.update(signedMaterial);

    let isValid: boolean;
    try {
      isValid = verifier.verify(device.publicKeyPem, Buffer.from(signature, 'base64'));
    } catch (err) {
      this.logger.error(`Signature verification error: ${err.message}`);
      isValid = false;
    }

    // Step 7: Delete challenge (one-time use = replay protection)
    await this.redis.del(`challenge:${challengeId}`);

    // Step 8: Run policy engine
    const policyResult = this.policyService.evaluate({
      device: {
        status: device.status,
        lastHeartbeat: device.lastHeartbeat,
        hardwareBound: device.hardwareBound,
      },
      signatureValid: isValid,
      challengeExpired: isExpired,
      hasMeetingBinding: true,
    });

    // Step 9: Update participant trust status
    await this.prisma.meetingParticipant.update({
      where: { id: challenge.participant_id },
      data: {
        trustStatus: policyResult.status,
        statusReason: policyResult.reason,
        lastChallengeAt: new Date(),
      },
    });

    // Step 10: Audit
    await this.audit.log({
      tenantId: challenge.tenant_id,
      meetingId: challenge.meeting_id,
      eventType: policyResult.status === 'VERIFIED' ? 'CHALLENGE_PASSED' : 'CHALLENGE_FAILED',
      actor: challenge.user_id,
      details: {
        challenge_id: challengeId,
        participant_id: challenge.participant_id,
        device_id: deviceId,
        status: policyResult.status,
        reason: policyResult.reason,
        hardware_bound: device.hardwareBound,
        signature_valid: isValid,
      },
    });

    // Step 11: Emit update to dashboard
    this.gateway.emitMeetingUpdate(challenge.meeting_id, {
      participant_id: challenge.participant_id,
      trust_status: policyResult.status,
      reason: policyResult.reason,
    });

    this.logger.log(
      `Challenge ${challengeId} result: ${policyResult.status} — ${policyResult.reason}`,
    );

    return {
      valid: isValid,
      status: policyResult.status,
      reason: policyResult.reason,
    };
  }
}
