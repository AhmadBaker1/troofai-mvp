import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DeviceService } from '../device/device.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private deviceSockets = new Map<string, Socket>();
  private meetingSockets = new Map<string, Set<Socket>>();

  // ChallengeService is injected lazily to avoid circular dependency
  private challengeServiceRef: any = null;

  constructor(private deviceService: DeviceService) {}

  setChallengeService(service: any) {
    this.challengeServiceRef = service;
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [deviceId, socket] of this.deviceSockets.entries()) {
      if (socket.id === client.id) {
        this.deviceSockets.delete(deviceId);
        this.logger.log(`Device disconnected: ${deviceId}`);
        break;
      }
    }

    for (const [meetingId, sockets] of this.meetingSockets.entries()) {
      sockets.delete(client);
      if (sockets.size === 0) {
        this.meetingSockets.delete(meetingId);
      }
    }
  }

  @SubscribeMessage('device:connect')
  handleDeviceConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { device_id: string },
  ) {
    this.deviceSockets.set(data.device_id, client);
    this.logger.log(`Device registered: ${data.device_id}`);
    return { event: 'device:connected', data: { status: 'ok' } };
  }

  @SubscribeMessage('device:heartbeat')
  async handleHeartbeat(@MessageBody() data: { device_id: string }) {
    try {
      await this.deviceService.heartbeat(data.device_id);
      this.logger.debug(`Heartbeat from device: ${data.device_id}`);
    } catch (err) {
      this.logger.warn(`Heartbeat failed for device: ${data.device_id}`);
    }
    return { event: 'device:heartbeat:ack', data: { status: 'ok' } };
  }

  @SubscribeMessage('challenge:response')
  async handleChallengeResponse(
    @MessageBody() data: { challenge_id: string; device_id: string; signature: string },
  ) {
    this.logger.log(
      `Challenge response from device ${data.device_id} for challenge ${data.challenge_id}`,
    );

    if (this.challengeServiceRef) {
      const result = await this.challengeServiceRef.verifyResponse(
        data.challenge_id,
        data.device_id,
        data.signature,
      );
      return { event: 'challenge:result', data: result };
    }

    return { event: 'challenge:result', data: { error: 'Service not ready' } };
  }

  @SubscribeMessage('meeting:subscribe')
  handleMeetingSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meeting_id: string },
  ) {
    if (!this.meetingSockets.has(data.meeting_id)) {
      this.meetingSockets.set(data.meeting_id, new Set());
    }
    this.meetingSockets.get(data.meeting_id).add(client);
    this.logger.log(`Client subscribed to meeting: ${data.meeting_id}`);
    return { event: 'meeting:subscribed', data: { meeting_id: data.meeting_id } };
  }

  // --- Methods called by ChallengeService ---

  emitChallengeToDevice(deviceId: string, payload: any) {
    const socket = this.deviceSockets.get(deviceId);
    if (socket) {
      socket.emit('challenge:issue', payload);
      this.logger.log(`Challenge sent to device ${deviceId}`);
    } else {
      this.logger.warn(`Device ${deviceId} not connected — challenge cannot be delivered`);
    }
  }

  emitMeetingUpdate(meetingId: string, payload: any) {
    const sockets = this.meetingSockets.get(meetingId);
    if (sockets) {
      for (const socket of sockets) {
        socket.emit('meeting:status-update', payload);
      }
    }
    // Broadcast to all connected clients as fallback
    this.server?.emit('meeting:status-update', { meeting_id: meetingId, ...payload });
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.deviceSockets.has(deviceId);
  }

  getConnectedDeviceIds(): string[] {
    return Array.from(this.deviceSockets.keys());
  }
}
