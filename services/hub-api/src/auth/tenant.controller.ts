import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('tenants')
export class TenantController {
  constructor(private authService: AuthService) {}

  @Get('demo')
  async getDemoTenant() {
    const tenant = await this.authService.ensureDemoTenant();
    return {
      tenant_id: tenant.id,
      name: tenant.name,
      api_key: tenant.apiKey,
    };
  }
}
