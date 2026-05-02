import { IsString } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  tenant_id: string;

  @IsString()
  name: string;
}

export class AddParticipantDto {
  @IsString()
  user_id: string;

  @IsString()
  display_name: string;
}

export class RequestJoinTokenDto {
  @IsString()
  participant_id: string;
}

export class BindDeviceDto {
  @IsString()
  join_token: string;

  @IsString()
  device_id: string;

  @IsString()
  signature: string;
}
