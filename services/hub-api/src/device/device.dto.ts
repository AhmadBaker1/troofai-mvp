import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class EnrollDeviceDto {
  @IsString()
  tenant_id: string;

  @IsString()
  device_id: string;

  @IsString()
  user_id: string;

  @IsString()
  display_name: string;

  @IsString()
  public_key_pem: string;

  @IsString()
  @IsOptional()
  key_algorithm?: string;

  @IsBoolean()
  @IsOptional()
  hardware_bound?: boolean;

  @IsString()
  @IsOptional()
  agent_version?: string;
}
