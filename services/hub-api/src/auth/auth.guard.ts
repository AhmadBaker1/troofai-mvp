import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { apiKey },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach tenant to request for downstream use
    request.tenant = tenant;
    return true;
  }
}
