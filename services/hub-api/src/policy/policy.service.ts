import { Injectable } from '@nestjs/common';

/**
 * Policy engine per SPEC.md section 5.
 * Evaluates device trust status based on deterministic rules.
 */

export interface PolicyInput {
  device: {
    status: string;
    lastHeartbeat: Date | null;
    hardwareBound: boolean;
  };
  signatureValid: boolean;
  challengeExpired: boolean;
  hasMeetingBinding: boolean;
}

export interface PolicyResult {
  status: 'VERIFIED' | 'UNVERIFIED' | 'STALE' | 'UNKNOWN' | 'EXTERNAL' | 'FAILED';
  reason: string;
}

@Injectable()
export class PolicyService {
  private readonly HEARTBEAT_STALE_MS = 5 * 60 * 1000; // 5 minutes

  evaluate(input: PolicyInput): PolicyResult {
    // Rule 1: Device must be active
    if (input.device.status !== 'ACTIVE') {
      return { status: 'FAILED', reason: 'Device has been revoked' };
    }

    // Rule 2: Challenge must not be expired
    if (input.challengeExpired) {
      return { status: 'FAILED', reason: 'Challenge response expired' };
    }

    // Rule 3: Signature must be valid
    if (!input.signatureValid) {
      return { status: 'FAILED', reason: 'Invalid signature — key mismatch or tampering' };
    }

    // Rule 4: Must have meeting-presence binding
    if (!input.hasMeetingBinding) {
      return { status: 'UNKNOWN', reason: 'No meeting-presence binding' };
    }

    // Rule 5: Heartbeat must be fresh
    if (input.device.lastHeartbeat) {
      const ageMs = Date.now() - input.device.lastHeartbeat.getTime();
      if (ageMs > this.HEARTBEAT_STALE_MS) {
        return {
          status: 'STALE',
          reason: `Device heartbeat stale (${Math.round(ageMs / 1000)}s ago)`,
        };
      }
    }

    // All checks passed
    return {
      status: 'VERIFIED',
      reason: `Enrolled device, valid signature${input.device.hardwareBound ? ', hardware-backed key' : ''}`,
    };
  }
}
